import { Timestamp } from "firebase/firestore";

export interface NotificationPreferences {
  email: boolean;
  text: boolean;
  push: boolean;
}

export type UserGender = "male" | "female" | "other";

/** Pawmily is for ages 13 and up, so there is no younger range. */
export const AGE_RANGES = ["13–17", "18–25", "26–40", "41–60", "60+"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

/** What the user enjoys, used to suggest family challenges. */
export const INTERESTS = [
  "Outdoors & nature",
  "Food & cooking",
  "Games",
  "Arts & crafts",
  "Fitness & sports",
  "Movies & music",
  "Exploring new places",
  "Relaxing at home",
] as const;
export type Interest = (typeof INTERESTS)[number];

export interface User {
  userId: string;
  name: string;
  email: string;
  age: number | null;
  gender: UserGender | null;
  /** Set on the About you step. Missing on older accounts. */
  ageRange?: AgeRange | null;
  interests?: Interest[];
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
