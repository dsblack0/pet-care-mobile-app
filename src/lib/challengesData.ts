// Data for the Challenges tab, a single challenge's progress, and Rewards / Pet XP.
// Read from Firestore.
import { doc, updateDoc } from "firebase/firestore";

import {
  getChallenge,
  getChallengesForPet,
  getLevels,
  getMemoriesForPet,
  getPet,
  getRewards,
  getUsersById,
} from "@/lib/db";
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
