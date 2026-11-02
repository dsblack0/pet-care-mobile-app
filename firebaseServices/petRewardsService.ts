import {
  collection,
  doc,
  DocumentReference,
  getDocs,
  query,
  where,
  updateDoc,
  runTransaction,
  Timestamp
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import {
  NewPetReward,
  PetReward
} from "../models/petRewards";

export function getPetReference(
  petId: string
): DocumentReference {
  return doc(db, "pets", petId);
}

export function getRewardReference(
  rewardId: string
): DocumentReference {
  return doc(db, "rewards", rewardId);
}

// Unlock a reward for a pet
export async function savePetReward(
  petReward: NewPetReward
): Promise<string> {
  // Use one deterministic ID per pet/reward pair
  // to prevent duplicate unlock records.
  const petId = petReward.petId.id;
  const rewardId = petReward.rewardId.id;
  const petRewardId = `${petId}_${rewardId}`;

  const petRewardRef = doc(
    db,
    "petRewards",
    petRewardId
  );

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(petRewardRef);
    const rewardSnap = await transaction.get(petReward.rewardId);
    const petSnap = await transaction.get(petReward.petId);

    if (!rewardSnap.exists()) {
      throw new Error("Reward not found");
    }

    if (!petSnap.exists()) {
      throw new Error("Pet not found");
    }

    if (existing.exists()) {
      return;
    }

    const pointRequirement = rewardSnap.data().pointRequirement;
    const totalPoints = petSnap.data().totalPoints;

    if (
      typeof pointRequirement !== "number" ||
      typeof totalPoints !== "number" ||
      totalPoints < pointRequirement
    ) {
      throw new Error("Pet has not earned enough points");
    }

    transaction.set(petRewardRef, {
      ...petReward,
      unlockedAt: Timestamp.now()
    });
  });

  return petRewardId;
}

// Get all unlocked rewards for a pet
export async function getPetRewards(
  petId: string
): Promise<PetReward[]> {
  const petReference = getPetReference(petId);

  const q = query(
    collection(db, "petRewards"),
    where("petId", "==", petReference)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    petRewardId: document.id,
    ...document.data()
  })) as PetReward[];
}

// Check if a specific reward is unlocked
export async function isRewardUnlocked(
  petId: string,
  rewardId: string
): Promise<boolean> {
  const petRewardRef = doc(
    db,
    "petRewards",
    `${petId}_${rewardId}`
  );

  const { getDoc } = await import("firebase/firestore");
  const snapshot = await getDoc(petRewardRef);

  return snapshot.exists();
}

// Update the exported image path
export async function updateRewardExportPath(
  petRewardId: string,
  rewardExportPath: string
): Promise<void> {
  const petRewardRef = doc(
    db,
    "petRewards",
    petRewardId
  );

  await updateDoc(petRewardRef, {
    rewardExportPath
  });
}