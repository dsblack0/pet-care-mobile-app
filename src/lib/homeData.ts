// Data access for the Home screen. Currently backed by mock data; each function is async
// so the bodies can be swapped for Firestore queries without touching the UI.
import * as mock from '@/data/mockData';
import type {
  CareSchedule,
  Challenge,
  FirestoreDate,
  Level,
  Memory,
  Pet,
  User,
} from '@/types/firestore';

export function toDate(value: FirestoreDate): Date {
  return new Date(value);
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
  const petIds = mock.userPets.filter((up) => up.userId === userId).map((up) => up.petId);
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
  // levelNum is a string in the sample data, so compare as numbers.
  const level = mock.levels.find((l) => Number(l.levelNum) === pet.level) ?? null;

  const challenge =
    mock.challenges
      .filter((c) => c.petId === pet.petId && c.completionStatus === 'in_progress')
      .sort((a, b) => toDate(a.endDate).getTime() - toDate(b.endDate).getTime())[0] ?? null;

  const schedules = mock.careSchedules
    .filter((s) => s.petId === pet.petId)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const memories = mock.memories
    .filter((m) => m.petId === pet.petId)
    .sort((a, b) => toDate(b.occurredAt).getTime() - toDate(a.occurredAt).getTime());

  const usersById = await fetchUsers([
    ...(challenge?.participants ?? []),
    ...memories.flatMap((m) => [m.createdBy, ...m.participants]),
  ]);

  // petPhotoPath is a Storage path; resolve to a download URL once Firebase is wired up.
  return { level, photoUrl: null, challenge, schedules, memories, usersById };
}
