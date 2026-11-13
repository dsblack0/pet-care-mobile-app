// Data for the Challenges tab, a single challenge's progress, and Rewards / Pet XP.
// Read from Firestore.
import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import {
  getChallenge,
  getChallengesForPet,
  getLevels,
  getMemoriesForPet,
  getPet,
  getRewards,
  getUserPetsForPet,
  getUsersById,
  petRef,
  userRef,
} from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { sundayUTC, weekEnd } from "@/lib/weeklyChallenges";
import { toDate } from "@/lib/homeData";
import { dataVersionStore } from "@/lib/store";
import type {
  Challenge,
  Level,
  Memory,
  Pet,
  Reward,
  User,
} from "@/types/firestore";
import { db } from "../../firebaseConfig";

/** How a challenge is described on cards, from its goalType / jointActivity. */
export function challengeKind(c: Challenge): { label: string; unit: string } {
  if (c.goalType === "unique_participants")
    return { label: "Participation", unit: "family members" };
  if (c.jointActivity || c.goalType === "shared_activities")
    return { label: "Together", unit: "shared activities" };
  if (c.goalType === "minutes") return { label: "Collective", unit: "minutes" };
  if (c.goalType === "daily")
    return { label: "Anyone can contribute", unit: "days logged" };
  return { label: "Challenge", unit: "done" };
}

/** Whether the on-device AI wrote this challenge or it came from the free preset list. */
export function challengeSource(
  c: Challenge,
): "ai" | "preset" | "custom" | null {
  if (c.generatedBy === "apple-foundation-models") return "ai";
  if (c.generatedBy === "free-preset") return "preset";
  if (c.generatedBy === "manual") return "custom";
  return null;
}

export type ChallengesPage = {
  active: Challenge[];
  completed: Challenge[];
  usersById: Record<string, User>;
};

export async function fetchChallenges(petId: string): Promise<ChallengesPage> {
  const mine = await getChallengesForPet(petId);
  const usersById = await getUsersById(
    mine.flatMap((c) => c.completedBy.map((r) => r.id)),
  );
  return {
    active: mine
      .filter((c) => c.completionStatus === "in_progress")
      .sort((a, b) => a.endDate.toMillis() - b.endDate.toMillis()),
    completed: mine
      .filter((c) => c.completionStatus === "completed")
      .sort(
        (a, b) =>
          (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0),
      ),
    usersById,
  };
}

export type ContributionRow = {
  user: User;
  done: boolean;
  /** Their latest matching memory in the challenge window, if any. */
  latest: Memory | null;
};

export type ChallengeDetail = { challenge: Challenge; rows: ContributionRow[] };

export async function fetchChallengeDetail(
  challengeId: string,
): Promise<ChallengeDetail | null> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return null;

  const start = toDate(challenge.startDate);
  const end = toDate(challenge.endDate);
  const matching = (await getMemoriesForPet(challenge.petId.id)).filter((m) => {
    const d = toDate(m.occurredAt);
    return (
      challenge.activityTypes.includes(m.activityType) && d >= start && d <= end
    );
  });

  const usersById = await getUsersById(challenge.participants.map((r) => r.id));
  const rows = challenge.participants
    .map((ref) => usersById[ref.id])
    .filter((u): u is User => !!u)
    .map((user) => ({
      user,
      done: challenge.completedBy.some((r) => r.id === user.userId),
      latest:
        matching.find((m) =>
          m.participants.some((p) => p.id === user.userId),
        ) ?? null,
    }));

  return { challenge, rows };
}

/** Stop an active challenge. It stays in the data with completionStatus "cancelled". */
export async function cancelChallenge(challengeId: string): Promise<void> {
  await updateDoc(doc(db, "challenges", challengeId), {
    completionStatus: "cancelled",
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
}

export type RewardsPage = {
  pet: Pet;
  level: Level | null;
  nextLevel: Level | null;
  unlocked: Reward[];
  /** Locked rewards, each with the level at which the pet's points will reach it. */
  upcoming: { reward: Reward; level: number }[];
};

/** The level a pet is at once it has `points`: levels start where the previous one ends. */
function levelForPoints(levels: Level[], points: number): number {
  const sorted = [...levels].sort((a, b) => a.levelNum - b.levelNum);
  let level = sorted[0]?.levelNum ?? 1;
  for (const l of sorted) {
    if (points >= l.nextLevelPoints) level = l.levelNum + 1;
  }
  return level;
}

export async function fetchRewards(petId: string): Promise<RewardsPage | null> {
  const [pet, levels, rewards] = await Promise.all([
    getPet(petId),
    getLevels(),
    getRewards(),
  ]);
  if (!pet) return null;
  const level = levels.find((l) => l.levelNum === pet.level) ?? null;
  const nextLevel = levels.find((l) => l.levelNum === pet.level + 1) ?? null;
  const sorted = [...rewards].sort(
    (a, b) => a.pointRequirement - b.pointRequirement,
  );
  return {
    pet,
    level,
    nextLevel,
    unlocked: sorted.filter((r) => pet.totalPoints >= r.pointRequirement),
    upcoming: sorted
      .filter((r) => pet.totalPoints < r.pointRequirement)
      .map((reward) => ({
        reward,
        level: levelForPoints(levels, reward.pointRequirement),
      })),
  };
}

// ---- Owner-made and owner-edited challenges ----

/** Ways a hand-made challenge can be counted. Same goalType values the generators use. */
export const MANUAL_GOAL_TYPES = [
  { value: "unique_activities", label: "Times done", unit: "times" },
  { value: "daily", label: "Days with a log", unit: "days" },
  { value: "duration", label: "Minutes", unit: "minutes" },
  {
    value: "unique_participants",
    label: "Everyone joins in",
    unit: "family members",
  },
] as const;

/** Points for a hand-made challenge, the same as a preset one. */
export const MANUAL_POINT_REWARD = 100;

/** True if this user created the pet's family (their userPets role is "owner"). */
export async function isPetOwner(petId: string, userId: string) {
  const links = await getUserPetsForPet(petId);
  return links.some((l) => l.userId.id === userId && l.role === "owner");
}

async function requirePetOwner(petId: string) {
  if (!(await isPetOwner(petId, currentUserId())))
    throw new Error("Only the pet's owner can add or edit challenges.");
}

/** The parts of a challenge the owner can change after it starts. */
export type ChallengeEdits = {
  title: string;
  description: string;
  goal: number;
  participantIds: string[];
};

export type NewChallengeInput = ChallengeEdits & {
  activityType: string;
  goalType: string;
};

function checkEdits(edits: ChallengeEdits, progress = 0) {
  const title = edits.title.trim();
  if (title.length < 3 || title.length > 100)
    throw new Error("Give the challenge a title of 3 to 100 characters.");
  if (!Number.isInteger(edits.goal) || edits.goal < 1 || edits.goal > 999)
    throw new Error("The goal must be a whole number from 1 to 999.");
  if (edits.goal <= progress)
    throw new Error(`The goal must be more than the ${progress} already done.`);
  if (edits.participantIds.length === 0)
    throw new Error("Pick at least one person to take part.");
  return {
    title,
    description: edits.description.trim(),
    goal: edits.goal,
    participants: edits.participantIds.map(userRef),
  };
}

/** Owner only: add a challenge by hand. It runs until the end of this challenge week. */
export async function createManualChallenge(
  petId: string,
  input: NewChallengeInput,
): Promise<string> {
  await requirePetOwner(petId);
  if (!MANUAL_GOAL_TYPES.some((t) => t.value === input.goalType))
    throw new Error("Choose how the challenge is counted.");
  if (!input.activityType) throw new Error("Choose what the challenge is for.");
  const fields = checkEdits(input);
  const week = sundayUTC(new Date());
  const ref = await addDoc(collection(db, "challenges"), {
    petId: petRef(petId),
    ...fields,
    completedBy: [],
    completedAt: null,
    completionStatus: "in_progress",
    startDate: Timestamp.now(),
    endDate: Timestamp.fromDate(weekEnd(week)),
    progress: 0,
    goalType: input.goalType,
    activityTypes: [input.activityType],
    jointActivity: false,
    pointReward: MANUAL_POINT_REWARD,
    generatedBy: "manual",
    generationWeek: week,
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
  return ref.id;
}

/**
 * Owner only: change an active challenge's title, description, goal and who takes part.
 * The activity, how it's counted and the points stay fixed so progress keeps counting correctly.
 */
export async function updateChallenge(
  challengeId: string,
  edits: ChallengeEdits,
): Promise<void> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) throw new Error("This challenge no longer exists.");
  await requirePetOwner(challenge.petId.id);
  if (challenge.completionStatus !== "in_progress")
    throw new Error("Only active challenges can be edited.");
  await updateDoc(
    doc(db, "challenges", challengeId),
    checkEdits(edits, challenge.progress),
  );
  dataVersionStore.set(dataVersionStore.get() + 1);
}
