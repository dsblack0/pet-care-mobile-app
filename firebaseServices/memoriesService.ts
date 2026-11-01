import {
  addDoc,
  collection,
  doc,
  DocumentReference
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { NewMemory } from "../models/memories";

export async function saveMemory(
  memory: NewMemory
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "memories"),
    memory
  );

  return docRef.id;
}

export function getPetReference(
  petId: string
): DocumentReference {
  return doc(db, "pets", petId);
}

export function getUserReference(
  userId: string
): DocumentReference {
  return doc(db, "users", userId);
}

export function getCareScheduleReference(
  careScheduleId: string
): DocumentReference {
  return doc(db, "careSchedules", careScheduleId);
}