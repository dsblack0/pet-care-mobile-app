import { DocumentReference, Timestamp } from "firebase/firestore";

export interface Invitation {
  invitationId: string;
  petId: DocumentReference;
  senderId: DocumentReference;
  toEmailAddress: string;
  deliveryStatus: "pending" | "sent" | "failed";
  acceptanceStatus: boolean;
  createdAt: Timestamp;
  expiryDate: Timestamp;
  acceptedAt: Timestamp | null;
}

export type NewInvitation = Omit<Invitation, "invitationId">;

export const createInvitation = (
  petId: DocumentReference,
  senderId: DocumentReference,
  toEmailAddress: string,
): NewInvitation => {
  const createdAt = Timestamp.now();

  // Invitation expires 7 days after creation
  const expiryDate = Timestamp.fromMillis(
    createdAt.toMillis() + 7 * 24 * 60 * 60 * 1000,
  );

  return {
    petId,
    senderId,
    toEmailAddress,
    deliveryStatus: "pending",
    acceptanceStatus: false,
    createdAt,
    expiryDate,
    acceptedAt: null,
  };
};
