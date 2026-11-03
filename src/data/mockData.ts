// Mock data shaped like the team's models/. Replace with Firestore reads once it's seeded.
import { doc, Timestamp } from 'firebase/firestore';

import type {
  CareSchedule,
  Challenge,
  Invitation,
  Level,
  Memory,
  Nudge,
  Pet,
  Points,
  Recap,
  Reward,
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
  { levelNum: 5, title: 'Memory Maker', nextLevelPoints: 1500 },
  { levelNum: 6, title: 'Adventure Pal', nextLevelPoints: 2200 },
  { levelNum: 7, title: 'Family Favorite', nextLevelPoints: 3000 },
  { levelNum: 8, title: 'Legendary Companion', nextLevelPoints: 4000 },
];

// A reward is unlocked once the pet's totalPoints reach its pointRequirement.
export const rewards: Reward[] = [
  {
    rewardId: 'reward001',
    name: 'Pet store discounts',
    description: 'Save on toys, treats, and supplies for {pet}',
    pointRequirement: 100,
  },
  {
    rewardId: 'reward002',
    name: 'Collages for social media',
    description: "Create shareable collages with {pet}'s favorite memories",
    pointRequirement: 250,
  },
  {
    rewardId: 'reward003',
    name: 'Custom pet stickers',
    description: "Design digital stickers with {pet}'s name, photo, and favorite activity",
    pointRequirement: 400,
  },
  {
    rewardId: 'reward004',
    name: 'Printed sticker pack',
    description: "Order physical stickers with {pet}'s name and photo",
    pointRequirement: 600,
  },
  {
    rewardId: 'reward005',
    name: 'Larger printed sticker packs',
    description: 'Unlock more sizes and layouts for your next physical sticker order',
    pointRequirement: 1000,
  },
  {
    rewardId: 'reward006',
    name: 'More pet store discounts',
    description: 'Unlock more offers on toys, treats and supplies for {pet}',
    pointRequirement: 1500,
  },
  {
    rewardId: 'reward007',
    name: 'New social collage layouts',
    description: "Unlock more layouts for sharing {pet}'s favorite memories",
    pointRequirement: 2200,
  },
  {
    rewardId: 'reward008',
    name: 'Extra pet sticker designs',
    description: 'Unlock more designs for your digital custom pet stickers',
    pointRequirement: 3000,
  },
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

// Two more this week so every family member has something on the Family tab.
memories.push(
  {
    memoryId: 'memory005',
    petId: pet('pet001'),
    createdBy: user('user001'),
    createdAt: at(2, 19, 10),
    occurredAt: at(2, 18, 30),
    photoPath: null,
    description: 'Sunset loop',
    location: null,
    activityType: 'Walk',
    participants: [user('user001')],
    careScheduleId: null,
    durationMinutes: 25,
    basePoints: 20,
    bonusPoints: 0,
  },
  {
    memoryId: 'memory006',
    petId: pet('pet001'),
    createdBy: user('user002'),
    createdAt: at(1, 8, 0),
    occurredAt: at(1, 7, 30),
    photoPath: null,
    description: 'Quick morning walk',
    location: null,
    activityType: 'Walk',
    participants: [user('user002')],
    careScheduleId: null,
    durationMinutes: 20,
    basePoints: 20,
    bonusPoints: 0,
  },
);

// A memory from exactly one year ago, for "A year ago today" on the Memories tab.
const yearAgo = new Date();
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
yearAgo.setHours(10, 0, 0, 0);
memories.push({
  memoryId: 'memory007',
  petId: pet('pet001'),
  createdBy: user('user002'),
  createdAt: Timestamp.fromDate(yearAgo),
  occurredAt: Timestamp.fromDate(yearAgo),
  photoPath: 'memories/memory007.jpg',
  description: "Milo's first brave step into the lake.",
  location: null,
  activityType: 'Walk',
  participants: [user('user002'), user('user003')],
  careScheduleId: null,
  durationMinutes: 40,
  basePoints: 20,
  bonusPoints: 5,
});

export const nudges: Nudge[] = [];

export const recaps: Recap[] = [];

export const invitations: Invitation[] = [
  {
    invitationId: 'invitation001',
    petId: pet('pet001'),
    senderId: user('user001'),
    toEmailAddress: 'sam@example.com',
    deliveryStatus: 'sent',
    acceptanceStatus: false,
    createdAt: at(3, 10, 0),
    expiryDate: at(-4, 10, 0),
    acceptedAt: null,
  },
];

export const challenges: Challenge[] = [
  {
    challengeId: 'challenge001',
    petId: pet('pet001'),
    participants: [user('user001'), user('user002'), user('user003'), user('user004')],
    jointActivity: false,
    completedBy: [user('user001'), user('user002'), user('user003')],
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
  {
    challengeId: 'challenge002',
    petId: pet('pet001'),
    participants: [user('user003'), user('user005')],
    jointActivity: false,
    completedBy: [user('user003'), user('user005')],
    completedAt: null,
    title: "Log Milo's feeding every day this week",
    description: 'Anyone can log a feed. Every day counts toward the goal.',
    completionStatus: 'in_progress',
    startDate: at(5, 0),
    endDate: at(-2, 23, 59),
    progress: 5,
    goal: 7,
    goalType: 'daily',
    activityTypes: ['Feed'],
    pointReward: 80,
  },
  {
    challengeId: 'challenge003',
    petId: pet('pet001'),
    participants: [user('user002'), user('user004'), user('user005')],
    jointActivity: false,
    completedBy: [user('user002'), user('user004'), user('user005')],
    completedAt: null,
    title: 'Spend 120 minutes playing together',
    description: 'Every play session adds its minutes to the family total.',
    completionStatus: 'in_progress',
    startDate: at(3, 0),
    endDate: at(-4, 23, 59),
    progress: 84,
    goal: 120,
    goalType: 'minutes',
    activityTypes: ['Play'],
    pointReward: 120,
  },
  {
    challengeId: 'challenge004',
    petId: pet('pet001'),
    participants: [user('user004'), user('user005')],
    jointActivity: true,
    completedBy: [user('user004'), user('user005')],
    completedAt: null,
    title: 'Complete 3 activities with another family member',
    description: 'Any activity counts when two or more of you do it together.',
    completionStatus: 'in_progress',
    startDate: at(2, 0),
    endDate: at(-5, 23, 59),
    progress: 2,
    goal: 3,
    goalType: 'shared_activities',
    activityTypes: ['Walk', 'Play', 'Train'],
    pointReward: 90,
  },
  {
    challengeId: 'challenge005',
    petId: pet('pet001'),
    participants: [user('user002'), user('user003'), user('user005')],
    jointActivity: true,
    completedBy: [user('user002'), user('user003'), user('user005')],
    completedAt: at(3, 18, 0),
    title: 'Three different family play sessions',
    description: 'Mom, Dad and Sam each added a moment with Milo.',
    completionStatus: 'completed',
    startDate: at(9, 0),
    endDate: at(3, 23, 59),
    progress: 3,
    goal: 3,
    goalType: 'unique_participants',
    activityTypes: ['Play'],
    pointReward: 75,
  },
  {
    challengeId: 'challenge006',
    petId: pet('pet001'),
    participants: [user('user001'), user('user003')],
    jointActivity: false,
    completedBy: [user('user001'), user('user003')],
    completedAt: at(10, 12, 0),
    title: 'Walk Milo 5 times this week',
    description: 'Five walks, shared between the two of you.',
    completionStatus: 'completed',
    startDate: at(16, 0),
    endDate: at(10, 23, 59),
    progress: 5,
    goal: 5,
    goalType: 'daily',
    activityTypes: ['Walk'],
    pointReward: 60,
  },
];
