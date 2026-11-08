import { addDoc, collection, doc, DocumentReference } from "firebase/firestore";

import { db } from "../firebaseConfig";
import { NewCareSchedule } from "../models/careSchedules";

export async function saveCareSchedule(
  schedule: NewCareSchedule,
): Promise<string> {
  const docRef = await addDoc(collection(db, "careSchedules"), schedule);

  return docRef.id;
}

// Retrieve a reference to an existing pet
export function getPetReference(petId: string): DocumentReference {
  return doc(db, "pets", petId);
}
