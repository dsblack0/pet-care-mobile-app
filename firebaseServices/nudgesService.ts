import {
  addDoc,
  collection,
  doc,
  DocumentReference
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { NewNudge } from "../models/nudges";

export async function saveNudge(
  nudge: NewNudge
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "nudges"),
    nudge
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