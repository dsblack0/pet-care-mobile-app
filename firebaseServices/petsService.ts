import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { NewPet } from "../models/pets";

export async function savePet(pet: NewPet): Promise<string> {
  const docRef = await addDoc(collection(db, "pets"), pet);

  return docRef.id;
}