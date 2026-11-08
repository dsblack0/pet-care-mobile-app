import { DocumentReference, Timestamp } from "firebase/firestore";

export interface Recap {
  recapId: string;
  petId: DocumentReference;
  createdBy: DocumentReference;
  createdAt: Timestamp;
  title: string;
  caption: string;
  startDate: Timestamp;
  endDate: Timestamp;
  memoriesUsed: DocumentReference[];
  exportPath: string | null;
}

export type NewRecap = Omit<Recap, "recapId">;

export const createRecap = (
  petId: DocumentReference,
  createdBy: DocumentReference,
  title: string,
  caption: string,
  startDate: Timestamp,
  endDate: Timestamp,
  memoriesUsed: DocumentReference[],
  exportPath: string | null = null,
): NewRecap => {
  return {
    petId,
    createdBy,
    createdAt: Timestamp.now(),
    title,
    caption,
    startDate,
    endDate,
    memoriesUsed,
    exportPath,
  };
};
