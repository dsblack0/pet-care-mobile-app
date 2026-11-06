// Creating a pet in Firestore. Built with the team's models/pets and models/userPets.
import { collection, doc, setDoc } from 'firebase/firestore';

import { uploadImage } from '@/lib/storage';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { Pet } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import {
  getPetReference,
  getUserReference,
  saveUserPet,
} from '../../firebaseServices/userPetsService';
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
  const petId = doc(collection(db, 'pets')).id;

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
  await setDoc(doc(db, 'pets', petId), newPet);
  const pet: Pet = { petId, ...newPet };

  await saveUserPet(createUserPet(getUserReference(ownerId), getPetReference(petId), 'owner'));

  selectedPetStore.set(petId);
  dataVersionStore.set(dataVersionStore.get() + 1);
  return pet;
}
