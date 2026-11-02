import {
  addDoc,
  collection,
  doc,
  DocumentReference,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { NewRecap } from "../models/recaps";

export async function saveRecap(
  recap: NewRecap
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "recaps"),
    recap
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

export function getMemoryReference(
  memoryId: string
): DocumentReference {
  return doc(db, "memories", memoryId);
}

export async function updateRecapExportPath(
  recapId: string,
  exportPath: string
): Promise<void> {
  const recapRef = doc(db, "recaps", recapId);

  await updateDoc(recapRef, {
    exportPath,
  });
}