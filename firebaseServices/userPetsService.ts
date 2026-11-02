import {
  addDoc,
  collection,
  doc,
  DocumentReference
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { NewUserPet } from "../models/userPets";

export async function saveUserPet(
  userPet: NewUserPet
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "userPets"),
    userPet
  );

  return docRef.id;
}

export function getUserReference(
  userId: string
): DocumentReference {
  return doc(db, "users", userId);
}

export function getPetReference(
  petId: string
): DocumentReference {
  return doc(db, "pets", petId);
}