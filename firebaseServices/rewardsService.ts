import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import { db } from "../firebaseConfig";
import { Reward } from "../models/rewards";

export async function getAllRewards(): Promise<Reward[]> {
  const snapshot = await getDocs(collection(db, "rewards"));

  return snapshot.docs.map((document) => ({
    rewardId: document.id,
    ...document.data(),
  })) as Reward[];
}

export async function getReward(rewardId: string): Promise<Reward | null> {
  const rewardRef = doc(db, "rewards", rewardId);
  const snapshot = await getDoc(rewardRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    rewardId: snapshot.id,
    ...snapshot.data(),
  } as Reward;
}
