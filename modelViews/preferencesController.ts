import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createChallengePreference } from '../models/challengePreferences';
import { changed, petReference, requireMember, userReference } from './core';
export async function getChallengePreferences(petId: string) {
  await requireMember(petId);
  const result = await getDocs(query(collection(db, 'challengePreferences'), where('petId','==',petReference(petId))));
  return result.docs.map(d => ({ challengePreferenceId: d.id, ...d.data() }));
}
export async function saveChallengePreferences(petId: string, userIds: string[], activityTypes: string[]) {
  await requireMember(petId);
  const unique = [...new Set(activityTypes.map(s => s.trim()).filter(Boolean))];
  const id = `${petId}_${[...new Set(userIds)].sort().join('_')}`;
  await setDoc(doc(db, 'challengePreferences', id), createChallengePreference(petReference(petId), [...new Set(userIds)].map(userReference), unique));
  changed();
  return id;
}
