// Data access for the Home screen. Currently backed by mock data; each function is async
// so the bodies can be swapped for Firestore queries without touching the UI.
import type { Timestamp } from 'firebase/firestore';

import * as mock from '@/data/mockData';
import type { CareSchedule, Challenge, Level, Memory, Pet, User } from '@/types/firestore';

export function toDate(value: Timestamp): Date {
  return value.toDate();
}

export async function fetchUser(userId: string): Promise<User | null> {
  return mock.users.find((u) => u.userId === userId) ?? null;
}

export async function fetchUsers(userIds: string[]): Promise<Record<string, User>> {
  const byId: Record<string, User> = {};
  for (const id of new Set(userIds)) {
    const user = await fetchUser(id);
    if (user) byId[id] = user;
  }
  return byId;
}

export async function fetchPetsForUser(userId: string): Promise<Pet[]> {
  const petIds = mock.userPets.filter((up) => up.userId.id === userId).map((up) => up.petId.id);
  return mock.pets.filter((p) => petIds.includes(p.petId));
}

export type PetHomeData = {
  level: Level | null;
  photoUrl: string | null;
  challenge: Challenge | null;
  schedules: CareSchedule[];
  memories: Memory[]; // newest first
  usersById: Record<string, User>;
};

export async function fetchPetHome(pet: Pet): Promise<PetHomeData> {
  const level = mock.levels.find((l) => l.levelNum === pet.level) ?? null;

  const challenge =
    mock.challenges
      .filter((c) => c.petId.id === pet.petId && c.completionStatus === 'in_progress')
      .sort((a, b) => toDate(a.endDate).getTime() - toDate(b.endDate).getTime())[0] ?? null;

  const schedules = mock.careSchedules
    .filter((s) => s.petId.id === pet.petId)
    // Schedules without a time go last.
    .sort((a, b) => (a.scheduledTime ?? '99:99').localeCompare(b.scheduledTime ?? '99:99'));

  const memories = mock.memories
    .filter((m) => m.petId.id === pet.petId)
    .sort((a, b) => toDate(b.occurredAt).getTime() - toDate(a.occurredAt).getTime());

  const usersById = await fetchUsers([
    ...(challenge?.participants ?? []).map((r) => r.id),
    ...memories.flatMap((m) => [m.createdBy.id, ...m.participants.map((r) => r.id)]),
  ]);

  // petPhotoPath is a Storage path; screens resolve it with useImageUrl when they show it.
  return { level, photoUrl: null, challenge, schedules, memories, usersById };
}

export async function fetchLevels(): Promise<Level[]> {
  return mock.levels;
}
