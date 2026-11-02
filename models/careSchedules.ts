import { DocumentReference } from "firebase/firestore";

export interface CareSchedule {
  careScheduleId: string;
  petId: DocumentReference;
  activityType: string;
  scheduledTime: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
}

export type NewCareSchedule = Omit<CareSchedule, "careScheduleId">;

export const createCareSchedule = (
  petId: DocumentReference,
  activityType: string,
  scheduledTime: string | null = null,
  recurrence: "daily" | "weekly" | "monthly" | "yearly" = "daily"
): NewCareSchedule => {
  return {
    petId,
    activityType,
    scheduledTime,
    recurrence,
  };
};