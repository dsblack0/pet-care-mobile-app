import { DocumentReference } from "firebase/firestore";

export interface ChallengePreference {
  challengePreferenceId: string;
  petId: DocumentReference;
  userIds: DocumentReference[];
  activityTypes: string[];
}

export type NewChallengePreference = Omit<
  ChallengePreference,
  "challengePreferenceId"
>;

export const createChallengePreference = (
  petId: DocumentReference,
  userIds: DocumentReference[],
  activityTypes: string[],
): NewChallengePreference => {
  return {
    petId,
    userIds,
    activityTypes,
  };
};
