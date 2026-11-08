import { initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomBytes, createHash } from 'node:crypto';

initializeApp();
const db = getFirestore();
const email = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const id = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
const fail = (message: string): never => { throw new HttpsError('failed-precondition', message); };
const uidOf = (request: { auth?: { uid: string } }) => request.auth?.uid ?? fail('Sign in first.');
const userRef = (uid: string) => db.doc(`users/${uid}`);
const petRef = (petId: string) => db.doc(`pets/${petId}`);
const membershipQuery = (petId: string, uid: string) => db.collection('userPets')
  .where('petId', '==', petRef(petId)).where('userId', '==', userRef(uid)).limit(1);
async function membership(petId: string, uid: string) {
  const snap = await membershipQuery(petId, uid).get();
  return snap.docs[0] ?? null;
}
async function requireOwner(petId: string, uid: string) {
  const row = await membership(petId, uid);
  if (!row || row.data().role !== 'owner') throw new HttpsError('permission-denied', 'Only the pet owner may invite members.');
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const days7 = 7 * 24 * 60 * 60 * 1000;

export const createPetInvitation = onCall(async request => {
  const uid = uidOf(request);
  const petId = id(request.data?.petId);
  const address = email(request.data?.email);
  if (!petId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new HttpsError('invalid-argument', 'Valid pet ID and email required.');
  await requireOwner(petId, uid);
  const [pet, members, invites] = await Promise.all([
    petRef(petId).get(), db.collection('userPets').where('petId', '==', petRef(petId)).get(),
    db.collection('invitations').where('petId', '==', petRef(petId)).get(),
  ]);
  if (!pet.exists) fail('Pet does not exist.');
  const profiles = await Promise.all(members.docs.map(d => d.data().userId.get()));
  if (profiles.some(p => email(p.data()?.email) === address)) throw new HttpsError('already-exists', 'Already a family member.');
  if (invites.docs.some(d => email(d.data().toEmailAddress) === address && !d.data().acceptanceStatus && !d.data().revokedAt && d.data().expiryDate?.toMillis() > Date.now())) {
    throw new HttpsError('already-exists', 'An invitation is already pending. Revoke it before creating another.');
  }
  const token = randomBytes(32).toString('base64url');
  const ref = db.collection('invitations').doc();
  const now = Timestamp.now();
  await ref.create({ petId: petRef(petId), senderId: userRef(uid), toEmailAddress: address,
    deliveryStatus: 'pending', acceptanceStatus: false, createdAt: now,
    expiryDate: Timestamp.fromMillis(now.toMillis() + days7), acceptedAt: null,
    tokenHash: hash(token), revokedAt: null });
  return { invitationId: ref.id, token, expiresAt: now.toMillis() + days7 };
});

export const acceptPetInvitation = onCall(async request => {
  const uid = uidOf(request);
  const token = request.data?.token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,}$/.test(token)) throw new HttpsError('invalid-argument', 'Invalid invitation token.');
  // Use Firebase Auth claims, not editable Firestore profile fields.
  const account = await getAdminAuth().getUser(uid);
  if (!account.emailVerified || !account.email) throw new HttpsError('permission-denied', 'Verify your email before joining.');
  const verifiedEmail = email(account.email);
  const matches = await db.collection('invitations').where('tokenHash', '==', hash(token)).limit(1).get();
  if (matches.empty) throw new HttpsError('not-found', 'Invitation not found.');
  const inviteRef = matches.docs[0].ref;
  const result = await db.runTransaction(async tx => {
    const invite = await tx.get(inviteRef);
    const data = invite.data()!;
    if (data.acceptanceStatus || data.revokedAt || data.expiryDate?.toMillis() <= Date.now()) fail('Invitation expired, revoked or already used.');
    if (email(data.toEmailAddress) !== verifiedEmail) throw new HttpsError('permission-denied', 'Sign in with the invited email address.');
    const pet = data.petId as FirebaseFirestore.DocumentReference;
    const petId = pet.id;
    const [petSnap, userSnap, existingRows] = await Promise.all([
      tx.get(pet), tx.get(userRef(uid)), tx.get(membershipQuery(petId, uid)),
    ]);
    if (!petSnap.exists || !userSnap.exists) fail('Pet or user profile missing.');
    const alreadyMember = !existingRows.empty;
    if (!alreadyMember) {
      const memberRef = db.collection('userPets').doc();
      tx.create(memberRef, { petId: pet, userId: userRef(uid), role: 'member', joinedAt: Timestamp.now() });
      tx.update(pet, { numberOfMembers: FieldValue.increment(1) });
      tx.update(userRef(uid), { numberOfPets: FieldValue.increment(1) });
    }
    tx.update(inviteRef, { acceptanceStatus: true, acceptedAt: Timestamp.now() });
    return { petId, alreadyMember };
  });
  return result;
});

export const revokePetInvitation = onCall(async request => {
  const uid = uidOf(request);
  const invitationId = id(request.data?.invitationId);
  if (!invitationId) throw new HttpsError('invalid-argument', 'Invalid invitation ID.');
  const ref = db.doc(`invitations/${invitationId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Invitation not found.');
  await requireOwner(snap.data()!.petId.id, uid);
  await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (!current.exists || current.data()!.acceptanceStatus) fail('Cannot revoke an accepted invitation.');
    tx.update(ref, { revokedAt: Timestamp.now() });
  });
  return { revoked: true };
});

export const sendPetNudge = onCall(async request => {
  const uid = uidOf(request);
  const petId = id(request.data?.petId);
  const recipientId = id(request.data?.recipientId);
  if (!petId || !recipientId || uid === recipientId) throw new HttpsError('invalid-argument', 'Choose another family member.');
  const [senderMembership, recipientMembership, sender, pet, recipient] = await Promise.all([
    membership(petId, uid), membership(petId, recipientId), userRef(uid).get(), petRef(petId).get(), userRef(recipientId).get(),
  ]);
  if (!senderMembership || !recipientMembership) throw new HttpsError('permission-denied', 'Both users must belong to this pet family.');
  if (!sender.exists || !pet.exists || !recipient.exists) fail('Family member or pet not found.');
  const message = `${sender.data()?.name || 'A family member'} sent you a reminder to check in on ${pet.data()?.name || 'your pet'}!`;
  const ref = db.collection('nudges').doc();
  const throttle = db.doc(`nudgeCooldowns/${petId}_${uid}_${recipientId}`);
  await db.runTransaction(async tx => {
    const previous = await tx.get(throttle);
    if (previous.exists && previous.data()?.lastSent?.toMillis() > Date.now() - 60_000) {
      throw new HttpsError('resource-exhausted', 'Wait a minute before reminding this member again.');
    }
    tx.set(throttle, { lastSent: Timestamp.now() });
    tx.create(ref, { petId: petRef(petId), senderId: userRef(uid), recipientId: userRef(recipientId), message, createdAt: Timestamp.now(), deliveryStatus: 'pending' });
  });
  // Delivery must be performed by a separate trusted push worker; do not claim sent here.
  return { nudgeId: ref.id };
});

// Expo push delivery is asynchronous. Persist failure status for operational visibility.
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
export const deliverPetNudge = onDocumentCreated('nudges/{nudgeId}', async event => {
  const snap = event.data;
  if (!snap) return;
  const nudge = snap.data();
  if (nudge.deliveryStatus !== 'pending') return;
  const recipientId = nudge.recipientId?.id;
  if (!recipientId) { await snap.ref.update({ deliveryStatus: 'failed' }); return; }
  const recipient = await userRef(recipientId).get();
  if (recipient.data()?.notifications?.push === false) {
    await snap.ref.update({ deliveryStatus: 'failed', deliveryError: 'Recipient disabled push notifications' });
    return;
  }
  const tokens = await db.collection('pushTokens').where('userId', '==', userRef(recipientId)).get();
  const messages = tokens.docs.map(d => ({ to: d.data().token, sound: 'default', title: 'Pet Care Reminder 🐾', body: nudge.message, data: { petId: nudge.petId.id } }))
    .filter(m => typeof m.to === 'string' && /^ExponentPushToken\[|^ExpoPushToken\[/.test(m.to));
  if (!messages.length) { await snap.ref.update({ deliveryStatus: 'failed', deliveryError: 'No registered device' }); return; }
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages),
    });
    if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
    const payload: any = await response.json();
    const receipts = Array.isArray(payload.data) ? payload.data : [payload.data];
    if (!receipts.some((r: any) => r?.status === 'ok')) throw new Error('Expo rejected all push messages');
    await snap.ref.update({ deliveryStatus: 'sent', pushSubmittedAt: Timestamp.now() });
    // 'sent' means accepted by Expo, NOT confirmed delivered to a device.
  } catch (error) {
    await snap.ref.update({ deliveryStatus: 'failed', deliveryError: String(error).slice(0, 250) });
  }
});

/** Return only the owner's invitation metadata; never expose token hashes. */
export const listPetInvitations = onCall(async request => {
  const uid = uidOf(request);
  const petId = id(request.data?.petId);
  if (!petId) throw new HttpsError('invalid-argument', 'Pet ID required.');
  await requireOwner(petId, uid);
  const rows = await db.collection('invitations').where('petId', '==', petRef(petId)).get();
  return rows.docs.map(row => {
    const d = row.data();
    return { invitationId: row.id, petId, toEmailAddress: d.toEmailAddress,
      createdAt: d.createdAt?.toMillis() ?? null, expiresAt: d.expiryDate?.toMillis() ?? null,
      accepted: !!d.acceptanceStatus, revoked: !!d.revokedAt };
  });
});

/** Atomic pet + owner membership creation. No client can impersonate another owner. */
export const createOwnedPet = onCall(async request => {
  const uid = uidOf(request);
  const input = request.data?.pet;
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 ||
      typeof input.species !== 'string' || !input.species.trim() ||
      !['Male', 'Female'].includes(input.gender) ||
      typeof input.age !== 'number' || !Number.isFinite(input.age) || input.age < 0 || input.age > 100) {
    throw new HttpsError('invalid-argument', 'Invalid pet details.');
  }
  const petId = db.collection('pets').doc().id;
  const owner = userRef(uid);
  const pet = petRef(petId);
  await db.runTransaction(async tx => {
    const profile = await tx.get(owner);
    if (!profile.exists) fail('User profile missing.');
    tx.create(pet, {
      name: input.name.trim(), species: input.species.trim(), gender: input.gender,
      age: input.age, breed: typeof input.breed === 'string' ? input.breed : null,
      birthday: typeof input.birthday === 'string' ? input.birthday : null,
      weight: typeof input.weight === 'number' ? input.weight : null,
      petPhotoPath: null, numberOfMembers: 1, totalPoints: 0, level: 1,
    });
    tx.create(db.collection('userPets').doc(), {
      petId: pet, userId: owner, role: 'owner', joinedAt: Timestamp.now(),
    });
    tx.update(owner, { numberOfPets: FieldValue.increment(1) });
  });
  return { petId };
});

export const replacePetInvitation = onCall(async request => {
  const uid = uidOf(request);
  const invitationId = id(request.data?.invitationId);
  if (!invitationId) throw new HttpsError('invalid-argument', 'Invalid invitation ID.');
  const oldRef = db.doc(`invitations/${invitationId}`);
  const old = await oldRef.get();
  if (!old.exists) throw new HttpsError('not-found', 'Invitation not found.');
  const data = old.data()!;
  await requireOwner(data.petId.id, uid);
  if (data.acceptanceStatus) fail('Accepted invitation cannot be replaced.');
  const token = randomBytes(32).toString('base64url');
  const next = db.collection('invitations').doc();
  const now = Timestamp.now();
  await db.runTransaction(async tx => {
    const current = await tx.get(oldRef);
    if (!current.exists || current.data()!.acceptanceStatus || current.data()!.revokedAt) fail('Invitation is no longer active.');
    tx.update(oldRef, { revokedAt: now });
    tx.create(next, { petId: data.petId, senderId: userRef(uid), toEmailAddress: data.toEmailAddress,
      deliveryStatus: 'pending', acceptanceStatus: false, createdAt: now,
      expiryDate: Timestamp.fromMillis(now.toMillis() + days7), acceptedAt: null,
      tokenHash: hash(token), revokedAt: null });
  });
  return { invitationId: next.id, token, expiresAt: now.toMillis() + days7 };
});

/** Token-based invitation preview; no membership changes or token hash exposure. */
export const previewPetInvitation = onCall(async request => {
  const token = request.data?.token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,}$/.test(token))
    throw new HttpsError('invalid-argument', 'Invalid invitation link.');
  const rows = await db.collection('invitations').where('tokenHash', '==', hash(token)).limit(1).get();
  if (rows.empty) throw new HttpsError('not-found', 'Invitation not found.');
  const d = rows.docs[0].data();
  return { petId: d.petId.id, senderId: d.senderId.id, toEmailAddress: d.toEmailAddress,
    createdAt: d.createdAt.toMillis(), expiresAt: d.expiryDate.toMillis(),
    accepted: !!d.acceptanceStatus, revoked: !!d.revokedAt };
});
