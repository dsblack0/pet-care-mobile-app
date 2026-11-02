// Shapes follow the Firebase sample JSONs. Dates are ISO strings.
export type FirestoreDate = string;

export type User = {
  userId: string;
  name: string;
  email: string;
  joinedAt: FirestoreDate;
  profilePhotoPath?: string;
  numberOfPets: number;
  notifications?: { email: boolean; text: boolean; push: boolean };
};

export type Pet = {
  petId: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  age: number;
  birthday: string;
  petPhotoPath?: string;
  weight: number;
  numberOfMembers: number;
  totalPoints: number;
  level: number;
};

export type UserPet = {
  userId: string;
  petId: string;
  role: string;
  joinedAt: FirestoreDate;
};

export type CareSchedule = {
  id: string; // Firestore doc id, referenced by Memory.careScheduleId
  petId: string;
  activityType: string;
  scheduledTime: string; // "HH:mm"
  recurrence: string;
};

export type Memory = {
  memoryId: string;
  petId: string;
  createdBy: string;
  createdAt: FirestoreDate;
  occurredAt: FirestoreDate;
  photoPath?: string;
  description: string;
  location?: { latitude: number; longitude: number };
  activityType: string;
  participants: string[];
  careScheduleId?: string;
  durationMinutes?: number;
  basePoints: number;
  bonusPoints: number;
};

export type Challenge = {
  challengeId: string;
  petId: string;
  participants: string[];
  jointActivity: boolean;
  completedBy: string[];
  completedAt: FirestoreDate | null;
  title: string;
  description?: string;
  completionStatus: string;
  startDate: FirestoreDate;
  endDate: FirestoreDate;
  progress: number;
  goal: number;
  goalType: string;
  activityTypes: string[];
  pointReward: number;
};

export type Level = {
  levelNum: number | string;
  title: string;
  nextLevelPoints: number | string;
};

export type PointRule = {
  action: string;
  pointsGained: number | string;
};
