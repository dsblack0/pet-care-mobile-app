// Deploy to Cloudflare Workers. Set FIREBASE_SERVICE_ACCOUNT_JSON with `wrangler secret put`.
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const decode = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const utf8 = s => new TextEncoder().encode(s);
async function signRS256(privateKey, data) {
  const der = decode(privateKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(data)));
}
async function serviceToken(env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now()/1000);
  const head = b64(utf8(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const body = b64(utf8(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3500})));
  const assertion = `${head}.${body}.${await signRS256(sa.private_key, `${head}.${body}`)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}) });
  if (!res.ok) throw Error('Service authentication failed');
  return (await res.json()).access_token;
}
async function verifyWithFirebase(token, env) {
  // Identity Toolkit accounts:lookup validates Firebase ID tokens, including their signatures and expiration.
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})});
  if (!res.ok) throw Error('Invalid or expired sign-in');
  const data = await res.json(); const uid = data.users?.[0]?.localId;
  if (!uid) throw Error('No signed-in account');
  return uid;
}
const ref = (project, path) => `projects/${project}/databases/(default)/documents/${path}`;
async function firestore(env, access, path, init) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents${path.startsWith(':') ? path : '/' + path}`, { ...init, headers: {Authorization:`Bearer ${access}`, 'content-type':'application/json',...(init?.headers||{})} });
  if (!res.ok) { if (res.status === 404) return null; throw Error(`Database request failed: ${res.status}`); }
  return res.json();
}
async function memberships(env, access, uid) {
  const structuredQuery = {from:[{collectionId:'userPets'}],where:{fieldFilter:{field:{fieldPath:'userId'},op:'EQUAL',value:{referenceValue:ref(env.FIREBASE_PROJECT_ID,`users/${uid}`)}}}};
  const result = await firestore(env, access, ':runQuery', {method:'POST',body:JSON.stringify({structuredQuery})});
  return result.filter(x=>x.document).map(x=>x.document.fields?.petId?.referenceValue?.split('/').pop()).filter(Boolean);
}
export default { async fetch(request, env) {
  if (new URL(request.url).pathname !== '/remind' || request.method !== 'POST') return json({error:'Not found'},404);
  try {
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON || !env.FIREBASE_WEB_API_KEY) return json({error:'Server configuration incomplete'},503);
    const bearer = request.headers.get('Authorization') || '';
    if (!bearer.startsWith('Bearer ')) return json({error:'Sign in required'},401);
    const uid = await verifyWithFirebase(bearer.slice(7),env);
    const {petId,recipientId,petName} = await request.json();
    if (![petId,recipientId,petName].every(x=>typeof x==='string' && x.length>0 && x.length<200) || recipientId===uid) return json({error:'Invalid reminder'},400);
    const access = await serviceToken(env);
    const [senderPets,recipientPets,user] = await Promise.all([memberships(env,access,uid),memberships(env,access,recipientId),firestore(env,access,`users/${recipientId}`)]);
    if (!senderPets.includes(petId) || !recipientPets.includes(petId)) return json({error:'Both people must belong to this pet'},403);
    const pref = user?.fields?.notifications?.mapValue?.fields?.push?.booleanValue;
    const now = new Date().toISOString();
    const body = {fields:{senderUserId:{stringValue:uid},petId:{stringValue:petId},type:{stringValue:'family_reminder'},title:{stringValue:'Pawmily reminder'},body:{stringValue:`A family member sent a reminder about ${petName}`},createdAt:{timestampValue:now},read:{booleanValue:false}}};
    await firestore(env,access,`users/${recipientId}/notifications`,{method:'POST',body:JSON.stringify(body)});
    if (pref === false) return json({saved:true,push:false});
    const devices = await firestore(env,access,`users/${recipientId}/pushDevices?pageSize=100`);
    const tokens = (devices?.documents||[]).map(x=>x.fields?.token?.stringValue).filter(x=>typeof x==='string' && /^ExponentPushToken\[|^ExpoPushToken\[/.test(x));
    if (!tokens.length) return json({saved:true,push:false});
    const push = await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(tokens.map(to=>({to,title:'Pawmily reminder',body:`A family member sent a reminder about ${petName}`,sound:'default',channelId:'family',data:{petId}})))});
    if (!push.ok) return json({saved:true,push:false,error:'Push delivery request failed'});
    const result = await push.json();
    const tickets = Array.isArray(result.data) ? result.data : [result.data];
    const accepted = tickets.some(ticket => ticket?.status === 'ok');
    return json({saved:true,push:accepted,error:accepted ? undefined : 'Expo rejected the push request',tickets});
  } catch(e) { return json({error:e instanceof Error ? e.message:'Unable to send reminder'},500); }
}};
