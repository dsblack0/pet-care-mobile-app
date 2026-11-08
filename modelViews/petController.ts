import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { addPet, type NewPetInput } from '../src/lib/petData';
import { changed, requireMember, signedInId } from './core';
import { saveChallengePreferences } from './preferencesController';
export async function onboardPet(input: NewPetInput, activityPreferences: string[]) {
  const pet = await addPet(signedInId(), input);
  await saveChallengePreferences(pet.petId, [signedInId()], activityPreferences);
  return pet;
}
export async function updatePet(petId: string, updates: Partial<Pick<NewPetInput,'name'|'breed'|'weight'|'birthday'|'age'>>) {
  await requireMember(petId);
  const ref = doc(db, 'pets', petId);
  if (!(await getDoc(ref)).exists()) throw new Error('Pet not found.');
  await updateDoc(ref, updates);
  changed();
}
