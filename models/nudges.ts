import {
  DocumentReference,
  Timestamp
} from "firebase/firestore";

export interface Nudge {
  nudgeId: string;
  petId: DocumentReference;
  senderId: DocumentReference;
  recipientId: DocumentReference;
  message: string;
  createdAt: Timestamp;
  deliveryStatus: "pending" | "sent" | "failed";
}

export type NewNudge = Omit<Nudge, "nudgeId">;

export const createNudge = (
  petId: DocumentReference,
  senderId: DocumentReference,
  recipientId: DocumentReference,
  message: string
): NewNudge => {
  return {
    petId,
    senderId,
    recipientId,
    message,
    createdAt: Timestamp.now(),
    deliveryStatus: "pending",
  };
};