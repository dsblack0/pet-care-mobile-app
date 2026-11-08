// Data access for the Home screen, read from Firestore.
import type { Timestamp } from "firebase/firestore";

import {
  getChallengesForPet,
  getLevels,
  getMemoriesForPet,
  getPet,
  getSchedulesForPet,
  getUser,
  getUserPetsForUser,
  getUsersById,
} from "@/lib/db";
import type {
  CareSchedule,
  Challenge,
  Level,
  Memory,
  Pet,
  User,
} from "@/types/firestore";

export function toDate(value: Timestamp): Date {
  return value.toDate();
}

export async function fetchUser(userId: string): Promise<User | null> {
  return getUser(userId);
}

export async function fetchUsers(
  userIds: string[],
): Promise<Record<string, User>> {
  return getUsersById(userIds);
}

export async function fetchPetsForUser(userId: string): Promise<Pet[]> {
  const links = await getUserPetsForUser(userId);
  const pets = await Promise.all(links.map((l) => getPet(l.petId.id)));
  // Alphabetical so the default (first) pet is the same every time.
  return pets
    .filter((p): p is Pet => !!p)
    .sort((a, b) => a.name.localeCompare(b.name));
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
  const [levels, challenges, schedules, memories] = await Promise.all([
    getLevels(),
    getChallengesForPet(pet.petId),
    getSchedulesForPet(pet.petId),
    getMemoriesForPet(pet.petId),
  ]);
  const level = levels.find((l) => l.levelNum === pet.level) ?? null;

  const challenge =
    challenges
      .filter((c) => c.completionStatus === "in_progress")
      .sort(
        (a, b) => toDate(a.endDate).getTime() - toDate(b.endDate).getTime(),
      )[0] ?? null;

  const usersById = await fetchUsers([
    ...(challenge?.participants ?? []).map((r) => r.id),
    ...memories.flatMap((m) => [
      m.createdBy.id,
      ...m.participants.map((r) => r.id),
    ]),
  ]);

  // petPhotoPath is a Storage path; screens resolve it with useImageUrl when they show it.
  return { level, photoUrl: null, challenge, schedules, memories, usersById };
}

export async function fetchLevels(): Promise<Level[]> {
  return getLevels();
}
