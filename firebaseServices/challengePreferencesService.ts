import { addDoc, collection, doc, DocumentReference } from "firebase/firestore";

import { db } from "../firebaseConfig";
import { NewChallengePreference } from "../models/challengePreferences";

export async function saveChallengePreference(
  preference: NewChallengePreference,
): Promise<string> {
  const docRef = await addDoc(
    collection(db, "challengePreferences"),
    preference,
  );

  return docRef.id;
}

export function getPetReference(petId: string): DocumentReference {
  return doc(db, "pets", petId);
}

export function getUserReference(userId: string): DocumentReference {
  return doc(db, "users", userId);
}
