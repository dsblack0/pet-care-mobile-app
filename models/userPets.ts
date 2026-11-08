import { DocumentReference, Timestamp } from "firebase/firestore";

export interface UserPet {
  userPetId: string;
  userId: DocumentReference;
  petId: DocumentReference;
  role: "owner" | "member";
  joinedAt: Timestamp;
}

export type NewUserPet = Omit<UserPet, "userPetId">;

export const createUserPet = (
  userId: DocumentReference,
  petId: DocumentReference,
  role: "owner" | "member" = "member",
): NewUserPet => {
  return {
    userId,
    petId,
    role,
    joinedAt: Timestamp.now(),
  };
};
