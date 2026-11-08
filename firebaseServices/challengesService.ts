import {
  addDoc,
  collection,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { Challenge, NewChallenge } from "../models/challenges";

// Save a new challenge to Firestore
export async function saveChallenge(challenge: NewChallenge): Promise<string> {
  const docRef = await addDoc(collection(db, "challenges"), challenge);

  return docRef.id;
}

// Get a reference to a pet
export function getPetReference(petId: string): DocumentReference {
  return doc(db, "pets", petId);
}

// Get a reference to a user
export function getUserReference(userId: string): DocumentReference {
  return doc(db, "users", userId);
}

// Get a specific challenge by ID
export async function getChallenge(
  challengeId: string,
): Promise<Challenge | null> {
  const challengeRef = doc(db, "challenges", challengeId);
  const snapshot = await getDoc(challengeRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...snapshot.data(),
    challengeId: snapshot.id,
  } as Challenge;
}

// Get all challenges for a specific pet
export async function getPetChallenges(petId: string): Promise<Challenge[]> {
  const petReference = getPetReference(petId);

  const q = query(
    collection(db, "challenges"),
    where("petId", "==", petReference),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    ...document.data(),
    challengeId: document.id,
  })) as Challenge[];
}
