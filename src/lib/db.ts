// Firestore reads shared by the data files. Each reader also smooths over small differences
// between the dummy data and the models/ types, so the screens get consistent shapes.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type {
  CareSchedule,
  Challenge,
  Invitation,
  Level,
  Memory,
  Pet,
  Points,
  Reward,
  User,
  UserPet,
} from "@/types/firestore";
import type { UserGender } from "../../models/users";
import { db } from "../../firebaseConfig";

export const petRef = (id: string) => doc(db, "pets", id);
export const userRef = (id: string) => doc(db, "users", id);

/** Placeholder text like "{file_path_from_firebase_storage}" is not a real Storage path. */
function storagePath(value: unknown): string | null {
  return typeof value === "string" && value && !value.startsWith("{")
    ? value
    : null;
}

/** YYYY-MM-DD from a string or Timestamp. */
function dateString(value: unknown): string | null {
  if (value instanceof Timestamp) {
    const d = value.toDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return typeof value === "string" ? value : null;
}

const num = (v: unknown, fallback = 0) =>
  v === null || v === undefined ? fallback : Number(v);

function toUser(id: string, d: DocumentData): User {
  // Some dummy users store notifications as a one-item list.
  const n = Array.isArray(d.notifications)
    ? d.notifications[0]
    : d.notifications;
  const age =
    typeof d.age === "number" && Number.isInteger(d.age) && d.age >= 0
      ? d.age
      : null;
  const gender: UserGender | null =
    d.gender === "male" || d.gender === "Male"
      ? "male"
      : d.gender === "female" || d.gender === "Female"
        ? "female"
        : d.gender === "other" || d.gender === "Other"
          ? "other"
          : null;
  return {
    userId: id,
    name: d.name ?? "",
    email: d.email ?? "",
    age,
    gender,
    joinedAt: d.joinedAt ?? Timestamp.now(),
    profilePhotoPath: storagePath(d.profilePhotoPath),
    numberOfPets: num(d.numberOfPets),
    notifications: { email: !!n?.email, text: !!n?.text, push: !!n?.push },
  };
}

function toPet(id: string, d: DocumentData): Pet {
  return {
    petId: id,
    name: d.name ?? "",
    species: d.species ?? "",
    breed: d.breed ?? null,
    gender: d.gender ?? "Male",
    age: num(d.age),
    birthday: dateString(d.birthday),
    petPhotoPath: storagePath(d.petPhotoPath),
    weight:
      d.weight === null || d.weight === undefined ? null : Number(d.weight),
    numberOfMembers: num(d.numberOfMembers, 1),
    totalPoints: num(d.totalPoints),
    level: num(d.level, 1),
  };
}

function toMemory(s: QueryDocumentSnapshot): Memory {
  const d = s.data();
  return {
    memoryId: s.id,
    petId: d.petId,
    createdBy: d.createdBy,
    createdAt: d.createdAt ?? d.occurredAt,
    occurredAt: d.occurredAt,
    photoPath: storagePath(d.photoPath),
    description: d.description ?? "",
    location: d.location ?? null,
    activityType: d.activityType ?? "Other",
    participants: d.participants ?? [],
    careScheduleId: d.careScheduleId ?? null,
    durationMinutes:
      d.durationMinutes === null || d.durationMinutes === undefined
        ? null
        : Number(d.durationMinutes),
    basePoints: num(d.basePoints),
    bonusPoints: num(d.bonusPoints),
  };
}

function toChallenge(id: string, d: DocumentData): Challenge {
  return {
    challengeId: id,
    petId: d.petId,
    participants: d.participants ?? [],
    jointActivity: !!d.jointActivity,
    completedBy: d.completedBy ?? [],
    completedAt: d.completedAt ?? null,
    title: d.title ?? "",
    description: d.description,
    completionStatus: d.completionStatus ?? "in_progress",
    startDate: d.startDate,
    endDate: d.endDate,
    progress: num(d.progress),
    goal: num(d.goal),
    goalType: d.goalType ?? "",
    activityTypes: d.activityTypes ?? [],
    pointReward: num(d.pointReward),
  };
}

async function byPet(name: string, petId: string) {
  return (
    await getDocs(
      query(collection(db, name), where("petId", "==", petRef(petId))),
    )
  ).docs;
}

export async function getUser(id: string): Promise<User | null> {
  const s = await getDoc(userRef(id));
  return s.exists() ? toUser(s.id, s.data()) : null;
}

export async function getUsersById(
  ids: string[],
): Promise<Record<string, User>> {
  const unique = [...new Set(ids)];
  const users = await Promise.all(unique.map(getUser));
  return Object.fromEntries(
    users.filter((u): u is User => !!u).map((u) => [u.userId, u]),
  );
}

export async function getPet(id: string): Promise<Pet | null> {
  const s = await getDoc(petRef(id));
  return s.exists() ? toPet(s.id, s.data()) : null;
}

export async function getUserPetsForUser(userId: string): Promise<UserPet[]> {
  const q = query(
    collection(db, "userPets"),
    where("userId", "==", userRef(userId)),
  );
  return (await getDocs(q)).docs.map((s) => ({
    ...(s.data() as Omit<UserPet, "userPetId">),
    userPetId: s.id,
  }));
}

export async function getUserPetsForPet(petId: string): Promise<UserPet[]> {
  return (await byPet("userPets", petId)).map((s) => ({
    ...(s.data() as Omit<UserPet, "userPetId">),
    userPetId: s.id,
  }));
}

/** Family members of a pet (userPets by petId -> users). */
export async function getFamily(petId: string): Promise<User[]> {
  const links = await getUserPetsForPet(petId);
  const byId = await getUsersById(links.map((l) => l.userId.id));
  return links.map((l) => byId[l.userId.id]).filter((u): u is User => !!u);
}

/** Newest first. */
export async function getMemoriesForPet(petId: string): Promise<Memory[]> {
  return (await byPet("memories", petId))
    .map(toMemory)
    .filter((m) => m.occurredAt)
    .sort((a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis());
}

/** By time of day; schedules without a time go last. */
export async function getSchedulesForPet(
  petId: string,
): Promise<CareSchedule[]> {
  return (await byPet("careSchedules", petId))
    .map((s) => ({
      ...(s.data() as Omit<CareSchedule, "careScheduleId">),
      careScheduleId: s.id,
    }))
    .sort((a, b) =>
      (a.scheduledTime ?? "99:99").localeCompare(b.scheduledTime ?? "99:99"),
    );
}

export async function getChallengesForPet(petId: string): Promise<Challenge[]> {
  return (await byPet("challenges", petId)).map((s) =>
    toChallenge(s.id, s.data()),
  );
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const s = await getDoc(doc(db, "challenges", id));
  return s.exists() ? toChallenge(s.id, s.data()) : null;
}

export async function getInvitationsForPet(
  petId: string,
): Promise<Invitation[]> {
  return (await byPet("invitations", petId)).map((s) => ({
    ...(s.data() as Omit<Invitation, "invitationId">),
    invitationId: s.id,
  }));
}

/** Some dummy levels use `name` instead of `title`. */
export async function getLevels(): Promise<Level[]> {
  return (await getDocs(collection(db, "levels"))).docs
    .map((s) => {
      const d = s.data();
      return {
        levelNum: num(d.levelNum),
        title: d.title ?? d.name ?? "",
        nextLevelPoints: num(d.nextLevelPoints),
      };
    })
    .sort((a, b) => a.levelNum - b.levelNum);
}

export async function getPoints(): Promise<Points[]> {
  return (await getDocs(collection(db, "points"))).docs.map((s) => ({
    action: s.data().action,
    pointsGained: num(s.data().pointsGained),
  }));
}

export async function getRewards(): Promise<Reward[]> {
  return (await getDocs(collection(db, "rewards"))).docs.map((s) => ({
    rewardId: s.id,
    name: s.data().name ?? "",
    description: s.data().description ?? "",
    pointRequirement: num(s.data().pointRequirement),
  }));
}
