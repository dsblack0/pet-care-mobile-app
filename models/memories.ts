import { DocumentReference, Timestamp, GeoPoint } from "firebase/firestore";

export interface Memory {
  memoryId: string;
  petId: DocumentReference;
  createdBy: DocumentReference;
  createdAt: Timestamp;
  occurredAt: Timestamp;
  photoPath: string | null;
  description: string;
  location: GeoPoint | null;
  activityType: string;
  participants: DocumentReference[];
  careScheduleId: DocumentReference | null;
  durationMinutes: number | null;
  basePoints: number;
  bonusPoints: number;
}

export type NewMemory = Omit<Memory, "memoryId">;

export const createMemory = (
  petId: DocumentReference,
  createdBy: DocumentReference,
  occurredAt: Timestamp,
  description: string,
  activityType: string,
  participants: DocumentReference[],
  photoPath: string | null = null,
  location: GeoPoint | null = null,
  careScheduleId: DocumentReference | null = null,
  durationMinutes: number | null = null,
  basePoints: number = 0,
  bonusPoints: number = 0,
): NewMemory => {
  return {
    petId,
    createdBy,
    createdAt: Timestamp.now(),
    occurredAt,
    photoPath,
    description,
    location,
    activityType,
    participants,
    careScheduleId,
    durationMinutes,
    basePoints,
    bonusPoints,
  };
};
