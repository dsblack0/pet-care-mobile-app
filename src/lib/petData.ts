// Creating a pet in Firestore. Built with the team's models/pets and models/userPets.
import { collection, doc, writeBatch, increment } from 'firebase/firestore';

import { uploadImage } from '@/lib/storage';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { Pet } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import { getUserReference } from '../../firebaseServices/userPetsService';
import { createPet } from '../../models/pets';
import { createUserPet } from '../../models/userPets';

export type NewPetInput = {
  name: string;
  species: string;
  gender: 'Male' | 'Female';
  age: number;
  breed: string | null;
  /** YYYY-MM-DD */
  birthday: string | null;
  weight: number | null;
  /** Local image from the picker. Uploaded to Storage; only its path is saved. */
  localPhotoUri: string | null;
};

/** Create the pet, make the creator its owner, and switch the app to it. */
export async function addPet(ownerId: string, input: NewPetInput): Promise<Pet> {
  const petRef = doc(collection(db, 'pets'));
  const petId = petRef.id;
  const membershipRef = doc(collection(db, 'userPets'));

  // Upload first so a failed upload never leaves a pet pointing at a missing image.
  const photoPath = input.localPhotoUri
    ? await uploadImage(input.localPhotoUri, `pets/${petId}.jpg`)
    : null;

  const newPet = createPet(
    input.name,
    input.species,
    input.gender,
    input.age,
    input.breed,
    input.birthday,
    photoPath,
    input.weight,
  );
  // setDoc (not savePet's addDoc) so the document uses the id the photo is named after.
  const batch = writeBatch(db);
  batch.set(petRef, { ...newPet, createdBy: ownerId, ownerMembershipId: membershipRef.id });
  batch.set(membershipRef, createUserPet(getUserReference(ownerId), petRef, 'owner'));
  batch.update(getUserReference(ownerId), { numberOfPets: increment(1) });
  await batch.commit();
  const pet: Pet = { petId, ...newPet };


  selectedPetStore.set(petId);
  dataVersionStore.set(dataVersionStore.get() + 1);
  return pet;
}
