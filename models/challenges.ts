import {
  DocumentReference,
  Timestamp
} from "firebase/firestore";

export interface Challenge {
  challengeId: string;
  petId: DocumentReference;
  participants: DocumentReference[];
  jointActivity: boolean;
  completedBy: DocumentReference[];
  completedAt: Timestamp | null;
  title: string;
  description: string;
  completionStatus: "in_progress" | "completed" | "expired";
  startDate: Timestamp;
  endDate: Timestamp;
  progress: number;
  goal: number;
  goalType: string;
  activityTypes: string[];
  pointReward: number;
}

export type NewChallenge = Omit<Challenge, "challengeId">;

export const createChallenge = (
  petId: DocumentReference,
  participants: DocumentReference[],
  jointActivity: boolean,
  title: string,
  description: string,
  startDate: Timestamp,
  endDate: Timestamp,
  goal: number,
  goalType: string,
  activityTypes: string[],
  pointReward: number
): NewChallenge => {
  return {
    petId,
    participants,
    jointActivity,
    completedBy: [],
    completedAt: null,
    title,
    description,
    completionStatus: "in_progress",
    startDate,
    endDate,
    progress: 0,
    goal,
    goalType,
    activityTypes,
    pointReward
  };
};