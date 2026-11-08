import { collection, doc, getDocs, runTransaction, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getFamily, getUserPetsForUser } from '../src/lib/db';
import { changed, petReference, requireMember, requireOwner, signedInId, userReference } from './core';
export const listFamilyMembers = async (petId: string) => { await requireMember(petId); return getFamily(petId); };
export const listMyPets = async () => getUserPetsForUser(signedInId());
export async function removeFamilyMember(petId: string, userId: string) {
  await requireOwner(petId);
  const rows = await getDocs(query(collection(db, 'userPets'), where('petId','==',petReference(petId)), where('userId','==',userReference(userId))));
  if (rows.empty) return;
  if (rows.docs.some(row => row.data().role === 'owner')) throw new Error('The owner cannot be removed.');
  await runTransaction(db, async tx => {
    const pet = await tx.get(petReference(petId));
    const user = await tx.get(userReference(userId));
    if (!pet.exists()) throw new Error('Pet not found.');
    rows.docs.forEach(row => tx.delete(row.ref));
    tx.update(pet.ref, { numberOfMembers: Math.max(1, (pet.data().numberOfMembers ?? 1) - rows.size) });
    if (user.exists()) tx.update(user.ref, { numberOfPets: Math.max(0, (user.data().numberOfPets ?? 0) - 1) });
  });
  changed();
}
