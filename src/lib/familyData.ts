// Data for the Family tab: this week's shared activity, each member's contributions, and today's
// care coverage. Read from Firestore.
import { getCareRows, partOfDay, type CareStatus } from '@/lib/care';
import {
  getChallengesForPet,
  getFamily,
  getMemoriesForPet,
  getSchedulesForPet,
  getUsersById,
} from '@/lib/db';
import { toDate } from '@/lib/homeData';
import { dataVersionStore } from '@/lib/store';
import type { CareSchedule, Memory, User } from '@/types/firestore';
import { remindFamilyMember } from '../../modelViews/notificationController';

/** Monday 00:00 of the current week, local time. */
function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const PLURAL: Record<string, [string, string]> = {
  Walk: ['walk', 'walks'],
  Feed: ['feed', 'feeds'],
  Play: ['play session', 'play sessions'],
  Train: ['training session', 'training sessions'],
  Groom: ['grooming', 'groomings'],
  Medication: ['medication', 'medications'],
  Photo: ['memory', 'memories'],
};

function countLabel(type: string, n: number): string {
  const [one, many] = PLURAL[type] ?? [type.toLowerCase(), type.toLowerCase()];
  return `${n} ${n === 1 ? one : many}`;
}

export type MemberWeek = {
  user: User;
  /** e.g. "Evening walks", from everything they've logged. */
  usuallyHelpsWith: string | null;
  /** e.g. "2 walks + 1 memory". */
  thisWeek: string | null;
  acts: number;
};

export type CoverageRow = {
  schedule: CareSchedule;
  label: string; // "Afternoon walk"
  status: CareStatus;
  doneBy?: string;
};

export type FamilyWeek = {
  contributions: number;
  sharedActivities: number;
  /** 0..1 across active challenges, or null when there are none. */
  goalProgress: number | null;
  walks: number;
  feeds: number;
  photoMemories: number;
  members: MemberWeek[];
  coverage: CoverageRow[];
};

const NOUN: Record<string, string> = {
  Feed: 'feeding',
  Walk: 'walk',
  Medication: 'medication',
  Play: 'play',
  Groom: 'grooming',
  Train: 'training',
};

export async function fetchFamilyWeek(petId: string): Promise<FamilyWeek> {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const [all, allChallenges, family, schedules] = await Promise.all([
    getMemoriesForPet(petId),
    getChallengesForPet(petId),
    getFamily(petId),
    getSchedulesForPet(petId),
  ]);
  const week = all.filter((m) => toDate(m.occurredAt) >= weekStart);

  const challenges = allChallenges.filter((c) => c.completionStatus === 'in_progress');
  const goal = challenges.reduce((sum, c) => sum + c.goal, 0);
  const progress = challenges.reduce((sum, c) => sum + Math.min(c.progress, c.goal), 0);

  const usersById = await getUsersById(all.map((m) => m.createdBy.id));

  const members = family.map((user) => {
    const involved = (m: Memory) => m.participants.some((p) => p.id === user.userId);
    return {
      user,
      usuallyHelpsWith: usuallyHelpsWith(all.filter(involved)),
      thisWeek: weekBreakdown(week.filter(involved)),
      acts: week.filter(involved).length,
    };
  });

  const coverage = getCareRows(schedules, all, usersById, now).map((row) => {
    const hour = row.schedule.scheduledTime
      ? Number(row.schedule.scheduledTime.split(':')[0])
      : null;
    const noun = NOUN[row.schedule.activityType] ?? row.schedule.activityType.toLowerCase();
    return {
      schedule: row.schedule,
      label: hour === null ? `Anytime ${noun}` : `${partOfDay(hour)} ${noun}`,
      status: row.status,
      doneBy: row.doneBy,
    };
  });

  return {
    contributions: week.length,
    sharedActivities: week.filter((m) => m.participants.length > 1).length,
    goalProgress: goal > 0 ? progress / goal : null,
    walks: week.filter((m) => m.activityType === 'Walk').length,
    feeds: week.filter((m) => m.activityType === 'Feed').length,
    photoMemories: week.filter((m) => !!m.photoPath).length,
    members,
    coverage,
  };
}

/** Most common activity and time of day across everything this member has logged. */
function usuallyHelpsWith(memories: Memory[]): string | null {
  if (memories.length === 0) return null;
  const counts = new Map<string, number>();
  for (const m of memories) {
    const key = `${partOfDay(toDate(m.occurredAt).getHours())}|${m.activityType}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const [part, type] = top.split('|');
  return `${part} ${PLURAL[type]?.[1] ?? type.toLowerCase()}`;
}

/** "2 walks + 1 memory": the two most frequent activity types this week. */
function weekBreakdown(memories: Memory[]): string | null {
  if (memories.length === 0) return null;
  const counts = new Map<string, number>();
  for (const m of memories) counts.set(m.activityType, (counts.get(m.activityType) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type, n]) => countLabel(type, n))
    .join(' + ');
}

/** Send a nudge to a family member about this pet. */
export async function sendNudge(
  petId: string,
  senderId: string,
  recipientId: string,
  petName: string,
) {
  void senderId;
  void petName;
  await remindFamilyMember(petId, recipientId);
}
