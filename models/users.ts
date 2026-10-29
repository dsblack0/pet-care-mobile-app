import { Timestamp } from 'firebase/firestore';

export interface NotificationPreferences {
  email: boolean;
  text: boolean;
  push: boolean;
}

export interface User {
  userId: string;
  name: string;
  email: string;
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
  profilePhotoPath: string | null = null
): NewUser => {
  return {
    name,
    email,
    joinedAt: Timestamp.now(),
    profilePhotoPath,
    numberOfPets: 0,
    notifications,
  };
};

