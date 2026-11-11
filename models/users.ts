import { Timestamp } from "firebase/firestore";

export interface NotificationPreferences {
  email: boolean;
  text: boolean;
  push: boolean;
}

export type UserGender = "male" | "female" | "other";

export interface User {
  userId: string;
  name: string;
  email: string;
  age: number | null;
  gender: UserGender | null;
  joinedAt: Timestamp;
  profilePhotoPath: string | null;
  numberOfPets: number;
  notifications: NotificationPreferences;
}

export type NewUser = Omit<User, "userId">;

export const createUser = (
  name: string,
  email: string,
  notifications: NotificationPreferences,
  profilePhotoPath: string | null = null,
  age: number | null = null,
  gender: UserGender | null = null,
): NewUser => {
  return {
    name,
    email,
    age,
    gender,
    joinedAt: Timestamp.now(),
    profilePhotoPath,
    numberOfPets: 0,
    notifications,
  };
};
