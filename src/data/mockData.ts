// Mock data shaped like the team's models/. Replace with Firestore reads once it's seeded.
import { doc, Timestamp } from 'firebase/firestore';

import type {
  CareSchedule,
  Challenge,
  Level,
  Memory,
  Pet,
  Points,
  User,
  UserPet,
} from '@/types/firestore';
import { db } from '../../firebaseConfig';

// Document references. Creating one doesn't touch the network.
const user = (id: string) => doc(db, 'users', id);
const pet = (id: string) => doc(db, 'pets', id);
const schedule = (id: string) => doc(db, 'careSchedules', id);

const ts = (iso: string) => Timestamp.fromDate(new Date(iso));

// Timestamp for a local time `daysAgo` days before today, so "Today" always has data.
function at(daysAgo: number, hours: number, minutes = 0): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return Timestamp.fromDate(d);
}

const notifications = { email: true, text: false, push: true };

export const users: User[] = [
  {
    userId: 'user001',
    name: 'Alex',
    email: 'alex@example.com',
    joinedAt: ts('2026-10-01T10:00:00Z'),
    profilePhotoPath: null,
    notifications,
    numberOfPets: 2,
  },
  {
    userId: 'user002',
    name: 'Mom',
    email: 'mom@example.com',
    joinedAt: ts('2026-10-01T10:00:00Z'),
    profilePhotoPath: null,
    notifications,
    numberOfPets: 2,
  },
  {
    userId: 'user003',
    name: 'Dad',
    email: 'dad@example.com',
    joinedAt: ts('2026-10-01T10:00:00Z'),
    profilePhotoPath: null,
    notifications,
    numberOfPets: 2,
  },
  {
    userId: 'user004',
    name: 'Leah',
    email: 'leah@example.com',
    joinedAt: ts('2026-10-01T10:00:00Z'),
    profilePhotoPath: null,
    notifications,
    numberOfPets: 1,
  },
  {
    userId: 'user005',
    name: 'Sam',
    email: 'sam@example.com',
    joinedAt: ts('2026-10-01T10:00:00Z'),
    profilePhotoPath: null,
    notifications,
    numberOfPets: 1,
  },
];

export const pets: Pet[] = [
  {
    petId: 'pet001',
    name: 'Milo',
    species: 'Dog',
    breed: 'Labrador',
    gender: 'Male',
    age: 3,
    birthday: '2023-12-20',
    petPhotoPath: 'pets/pet001.jpg',
    weight: 25.5,
    numberOfMembers: 5,
    totalPoints: 620,
    level: 4,
  },
  {
    petId: 'pet002',
    name: 'Luna',
    species: 'Cat',
    breed: 'Tabby',
    gender: 'Female',
    age: 2,
    birthday: '2024-05-02',
    petPhotoPath: 'pets/pet002.jpg',
    weight: 4.2,
    numberOfMembers: 2,
    totalPoints: 180,
    level: 2,
  },
];

export const userPets: UserPet[] = [
  {
    userPetId: 'user001_pet001',
    userId: user('user001'),
    petId: pet('pet001'),
    role: 'owner',
    joinedAt: ts('2026-10-01T10:30:00Z'),
  },
  {
    userPetId: 'user001_pet002',
    userId: user('user001'),
    petId: pet('pet002'),
    role: 'member',
    joinedAt: ts('2026-10-01T10:30:00Z'),
  },
  {
    userPetId: 'user002_pet001',
    userId: user('user002'),
    petId: pet('pet001'),
    role: 'member',
    joinedAt: ts('2026-10-01T10:30:00Z'),
  },
  {
    userPetId: 'user003_pet001',
    userId: user('user003'),
    petId: pet('pet001'),
    role: 'member',
    joinedAt: ts('2026-10-01T10:30:00Z'),
  },
  {
    userPetId: 'user004_pet001',
    userId: user('user004'),
    petId: pet('pet001'),
    role: 'member',
    joinedAt: ts('2026-10-01T10:30:00Z'),
  },
  {
    userPetId: 'user002_pet002',
    userId: user('user002'),
    petId: pet('pet002'),
    role: 'owner',
    joinedAt: ts('2026-10-01T10:30:00Z'),
  },
];

// Base points per activity.
export const points: Points[] = [
  { action: 'Walk', pointsGained: 20 },
  { action: 'Feed', pointsGained: 5 },
  { action: 'Play', pointsGained: 10 },
  { action: 'Train', pointsGained: 15 },
  { action: 'Groom', pointsGained: 10 },
  { action: 'Medication', pointsGained: 5 },
  { action: 'Other', pointsGained: 5 },
  { action: 'TogetherBonus', pointsGained: 5 },
];

export const levels: Level[] = [
  { levelNum: 1, title: 'Bonding Beginner', nextLevelPoints: 100 },
  { levelNum: 2, title: 'Cuddle Companion', nextLevelPoints: 250 },
  { levelNum: 3, title: 'Playtime Pal', nextLevelPoints: 500 },
  { levelNum: 4, title: 'Trail Buddy', nextLevelPoints: 1000 },
];

export const careSchedules: CareSchedule[] = [
  {
    careScheduleId: 'schedule001',
    petId: pet('pet001'),
    activityType: 'Feed',
    scheduledTime: '07:00',
    recurrence: 'daily',
  },
  {
    careScheduleId: 'schedule002',
    petId: pet('pet001'),
    activityType: 'Walk',
    scheduledTime: '15:00',
    recurrence: 'daily',
  },
  {
    careScheduleId: 'schedule003',
    petId: pet('pet001'),
    activityType: 'Medication',
    scheduledTime: '18:00',
    recurrence: 'daily',
  },
  {
    careScheduleId: 'schedule004',
    petId: pet('pet002'),
    activityType: 'Feed',
    scheduledTime: '08:00',
    recurrence: 'daily',
  },
];

export const memories: Memory[] = [
  {
    memoryId: 'memory001',
    petId: pet('pet001'),
    createdBy: user('user003'),
    createdAt: at(0, 7, 21),
    occurredAt: at(0, 7, 20),
    description: 'Breakfast',
    activityType: 'Feed',
    participants: [user('user003')],
    careScheduleId: schedule('schedule001'),
    photoPath: null,
    location: null,
    durationMinutes: null,
    basePoints: 5,
    bonusPoints: 0,
  },
  {
    memoryId: 'memory002',
    petId: pet('pet001'),
    createdBy: user('user003'),
    createdAt: at(0, 8, 40),
    occurredAt: at(0, 8, 4),
    description: 'Morning neighborhood walk',
    activityType: 'Walk',
    participants: [user('user003')],
    durationMinutes: 32,
    photoPath: null,
    location: null,
    careScheduleId: null,
    basePoints: 20,
    bonusPoints: 0,
  },
  {
    memoryId: 'memory003',
    petId: pet('pet001'),
    createdBy: user('user004'),
    createdAt: at(1, 14, 0),
    occurredAt: at(1, 14, 0),
    photoPath: 'memories/memory003.jpg',
    description: 'Couch nap memory',
    activityType: 'Photo',
    participants: [user('user004')],
    location: null,
    careScheduleId: null,
    durationMinutes: null,
    basePoints: 0,
    bonusPoints: 0,
  },
  {
    memoryId: 'memory004',
    petId: pet('pet001'),
    createdBy: user('user002'),
    createdAt: at(3, 17, 30),
    occurredAt: at(3, 17, 0),
    description: 'Backyard play together',
    activityType: 'Play',
    participants: [user('user002'), user('user005')],
    durationMinutes: 20,
    photoPath: null,
    location: null,
    careScheduleId: null,
    basePoints: 10,
    bonusPoints: 5,
  },
];

export const challenges: Challenge[] = [
  {
    challengeId: 'challenge001',
    petId: pet('pet001'),
    participants: [user('user001'), user('user002'), user('user003'), user('user004')],
    jointActivity: false,
    completedBy: [user('user002'), user('user003'), user('user004')],
    completedAt: null,
    title: 'Everyone walks Milo at least once this week',
    description: 'Have every family member walk Milo at least once this week.',
    completionStatus: 'in_progress',
    startDate: at(5, 0),
    endDate: at(-2, 23, 59),
    progress: 3,
    goal: 4,
    goalType: 'unique_participants',
    activityTypes: ['Walk'],
    pointReward: 100,
  },
];
