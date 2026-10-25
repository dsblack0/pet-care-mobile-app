import {Batch,Challenge,Context,ACTIVITY_TYPES,type ContextType,type ChallengeType,type ActivityType} from './schema';
import {calculateChallengeProgress} from './challenge-progress';
export function parseObject(raw:unknown):unknown {
 if(typeof raw!=='string')return raw;
 return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
}
export function validateContext(raw:unknown):ContextType {
 const c=Context.parse(raw);const ids=new Set(c.members.map(m=>m.id));
 if(new Set(c.preferences.map(p=>p.category)).size!==6)throw Error('Six distinct preferences required');
 for(const p of c.preferences){if(p.memberIds.some(id=>!ids.has(id)))throw Error('Unknown preference member');if(new Set(p.memberIds).size!==p.memberIds.length)throw Error('Duplicate preference member');}
 return c;
}
export function validateChallenge(raw:unknown,ctx:ContextType):ChallengeType {
 const c=Challenge.parse(parseObject(raw));
 if(c.petId!==ctx.pet.id)throw Error('Wrong pet');
 const category=(Object.keys(ACTIVITY_TYPES) as (keyof typeof ACTIVITY_TYPES)[]).find(k=>ACTIVITY_TYPES[k]===c.activityTypes[0]);
 if(!category||c.activityTypes.length!==1)throw Error('Unknown or multiple activity types');
 const p=ctx.preferences.find(p=>p.category===category);
 if(!p?.enabled||!p.memberIds.length)throw Error('Disabled category');
 if(category==='medication'&&!ctx.verifiedMedicationPlan)throw Error('Medication plan unverified');
 if(category==='medication'&&/\b(dose|dosage|mg|pill|tablet|extra|double|increase|decrease)\b/i.test(c.title))throw Error('Medication instruction');
 if(new Set(c.participants).size!==c.participants.length||c.participants.length!==p.memberIds.length||c.participants.some(id=>!p.memberIds.includes(id)))throw Error('Participants must exactly match category preferences');
 if(c.jointActivity&&c.participants.length<2)throw Error('Joint activity needs 2 eligible members');
 if(c.goalType==='unique_participants'&&(c.goal<2||c.goal>c.participants.length))throw Error('Invalid unique participant goal');
 if(c.goalType==='daily'&&c.goal>7)throw Error('Daily goal exceeds week');
 if(c.goalType==='duration'&&c.goal>240)throw Error('Excessive duration');
 if(c.goalType==='unique_activities'&&c.goal>14)throw Error('Excessive activity goal');
 if(c.progress>c.goal)throw Error('Progress exceeds goal');
 if(Date.parse(c.endDate)<Date.parse(c.startDate))throw Error('Invalid dates');
 if(c.completedBy.some(id=>!c.participants.includes(id)))throw Error('Invalid completedBy');
 return c;
}
export function validateBatch(raw:unknown,ctx:ContextType):ChallengeType[] {
 const parsed=Batch.parse(parseObject(raw));if(parsed.challenges.length!==ctx.weeklyCount)throw Error('Wrong challenge count');
 const titles=new Set<string>();const combos=new Set<string>();
 return parsed.challenges.map(rawChallenge=>{
 const c=validateChallenge(rawChallenge,ctx);const title=c.title.toLowerCase().replace(/[^a-z0-9]/g,'');
 const combo=`${c.activityTypes[0]}:${c.goalType}:${c.jointActivity}`;
 if(titles.has(title)||combos.has(combo))throw Error('Duplicate or overlapping challenge');
 titles.add(title);combos.add(combo);return c;
 });
}
export function progress(ch:ChallengeType,activities:ActivityType[]){
 const logs=activities.filter(a=>a.verified).map(a=>({activityId:a.id,petId:ch.petId,activityType:ACTIVITY_TYPES[a.category],timestamp:a.date.length===10?`${a.date}T12:00:00.000Z`:a.date,loggedBy:a.memberIds[0],additionalParticipants:a.memberIds.slice(1),durationMinutes:a.minutes}));
 return {value:calculateChallengeProgress(ch,logs),target:ch.goal};
}
