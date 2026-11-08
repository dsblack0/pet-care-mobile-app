// The app's data types come from the team's models/ folder. References to other documents are
// DocumentReferences (use `.id` for the id) and dates are Firestore Timestamps.
import type { DocumentReference, Timestamp } from "firebase/firestore";

export type { CareSchedule } from "../../models/careSchedules";
export type { Invitation } from "../../models/invitations";
export type { Level } from "../../models/levels";
export type { Memory } from "../../models/memories";
export type { Nudge } from "../../models/nudges";
export type { Pet } from "../../models/pets";
export type { Points } from "../../models/points";
export type { Recap } from "../../models/recaps";
export type { Reward } from "../../models/rewards";
export type { User } from "../../models/users";
export type { UserPet } from "../../models/userPets";

// models/ has no challenges model yet, so it's defined here in the same style.
export type Challenge = {
  challengeId: string;
  petId: DocumentReference;
  participants: DocumentReference[];
  jointActivity: boolean;
  completedBy: DocumentReference[];
  completedAt: Timestamp | null;
  title: string;
  description?: string;
  completionStatus: string;
  startDate: Timestamp;
  endDate: Timestamp;
  progress: number;
  goal: number;
  goalType: string;
  activityTypes: string[];
  pointReward: number;
};
