// Data for the Challenges tab, a single challenge's progress, and Rewards / Pet XP.
// Mock-backed like the other data files.
import * as mock from '@/data/mockData';
import { toDate } from '@/lib/homeData';
import { dataVersionStore } from '@/lib/store';
import type { Challenge, Level, Memory, Pet, Reward, User } from '@/types/firestore';

/** How a challenge is described on cards, from its goalType / jointActivity. */
export function challengeKind(c: Challenge): { label: string; unit: string } {
  if (c.goalType === 'unique_participants')
    return { label: 'Participation', unit: 'family members' };
  if (c.jointActivity || c.goalType === 'shared_activities')
    return { label: 'Together', unit: 'shared activities' };
  if (c.goalType === 'minutes') return { label: 'Collective', unit: 'minutes' };
  if (c.goalType === 'daily') return { label: 'Anyone can contribute', unit: 'days logged' };
  return { label: 'Challenge', unit: 'done' };
}

export type ChallengesPage = {
  active: Challenge[];
  completed: Challenge[];
  usersById: Record<string, User>;
};

export async function fetchChallenges(petId: string): Promise<ChallengesPage> {
  const mine = mock.challenges.filter((c) => c.petId.id === petId);
  return {
    active: mine
      .filter((c) => c.completionStatus === 'in_progress')
      .sort((a, b) => a.endDate.toMillis() - b.endDate.toMillis()),
    completed: mine
      .filter((c) => c.completionStatus === 'completed')
      .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0)),
    usersById: Object.fromEntries(mock.users.map((u) => [u.userId, u])),
  };
}

export type ContributionRow = {
  user: User;
  done: boolean;
  /** Their latest matching memory in the challenge window, if any. */
  latest: Memory | null;
};

export type ChallengeDetail = { challenge: Challenge; rows: ContributionRow[] };

export async function fetchChallengeDetail(challengeId: string): Promise<ChallengeDetail | null> {
  const challenge = mock.challenges.find((c) => c.challengeId === challengeId);
  if (!challenge) return null;

  const start = toDate(challenge.startDate);
  const end = toDate(challenge.endDate);
  const matching = mock.memories
    .filter((m) => {
      const d = toDate(m.occurredAt);
      return (
        m.petId.id === challenge.petId.id &&
        challenge.activityTypes.includes(m.activityType) &&
        d >= start &&
        d <= end
      );
    })
    .sort((a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis());

  const rows = challenge.participants
    .map((ref) => mock.users.find((u) => u.userId === ref.id))
    .filter((u): u is User => !!u)
    .map((user) => ({
      user,
      done: challenge.completedBy.some((r) => r.id === user.userId),
      latest: matching.find((m) => m.participants.some((p) => p.id === user.userId)) ?? null,
    }));

  return { challenge, rows };
}

/** Stop an active challenge. It stays in the data with completionStatus "cancelled". */
export async function cancelChallenge(challengeId: string): Promise<void> {
  const challenge = mock.challenges.find((c) => c.challengeId === challengeId);
  if (!challenge) return;
  challenge.completionStatus = 'cancelled';
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
  const pet = mock.pets.find((p) => p.petId === petId);
  if (!pet) return null;
  const level = mock.levels.find((l) => l.levelNum === pet.level) ?? null;
  const nextLevel = mock.levels.find((l) => l.levelNum === pet.level + 1) ?? null;
  const sorted = [...mock.rewards].sort((a, b) => a.pointRequirement - b.pointRequirement);
  return {
    pet,
    level,
    nextLevel,
    unlocked: sorted.filter((r) => pet.totalPoints >= r.pointRequirement),
    upcoming: sorted
      .filter((r) => pet.totalPoints < r.pointRequirement)
      .map((reward) => ({ reward, level: levelForPoints(mock.levels, reward.pointRequirement) })),
  };
}
