import { DocumentReference, Timestamp } from "firebase/firestore";

export interface PetReward {
  petRewardId: string;
  rewardId: DocumentReference;
  petId: DocumentReference;
  unlockedAt: Timestamp;
  rewardExportPath: string | null;
}

export type NewPetReward = Omit<PetReward, "petRewardId">;

export const createPetReward = (
  rewardId: DocumentReference,
  petId: DocumentReference,
  rewardExportPath: string | null = null,
): NewPetReward => {
  return {
    rewardId,
    petId,
    unlockedAt: Timestamp.now(),
    rewardExportPath,
  };
};
