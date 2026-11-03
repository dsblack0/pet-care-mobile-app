import { toDate } from '@/lib/homeData';
import { formatScheduledTime, formatTime, isSameDay } from '@/lib/format';
import type { CareSchedule, Memory, User } from '@/types/firestore';

export type CareStatus = 'Done' | 'Open' | 'Later';

export type CareRow = {
  schedule: CareSchedule;
  status: CareStatus;
  subtitle: string;
  doneBy?: string; // name of whoever logged it, when Done
};

// How the pet feels about today's care. Drives the animated face.
export type PetMood = 'happy' | 'waiting' | 'calm';

export function partOfDay(hour: number): string {
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export function getCareRows(
  schedules: CareSchedule[],
  memories: Memory[],
  usersById: Record<string, User>,
  now = new Date(),
): CareRow[] {
  const todays = memories.filter((m) => isSameDay(toDate(m.occurredAt), now));

  return schedules.map((s) => {
    const done = todays.find((m) => m.careScheduleId?.id === s.careScheduleId);

    if (done) {
      const doneBy = usersById[done.createdBy.id]?.name ?? 'someone';
      return {
        schedule: s,
        status: 'Done',
        subtitle: `${formatTime(toDate(done.occurredAt))} · by ${doneBy}`,
        doneBy,
      };
    }
    // No set time: due sometime today, never overdue.
    if (!s.scheduledTime) {
      return { schedule: s, status: 'Later', subtitle: 'Anytime today' };
    }
    const [h, min] = s.scheduledTime.split(':').map(Number);
    const due = new Date(now);
    due.setHours(h, min, 0, 0);
    if (now >= due) {
      return {
        schedule: s,
        status: 'Open',
        subtitle: `${partOfDay(h)} ${s.activityType.toLowerCase()} still needed`,
      };
    }
    return {
      schedule: s,
      status: 'Later',
      subtitle: `Due at ${formatScheduledTime(s.scheduledTime)}`,
    };
  });
}

// waiting: something is overdue. happy: everything due so far is done. calm: nothing due yet.
export function getMood(rows: CareRow[]): PetMood {
  if (rows.some((r) => r.status === 'Open')) return 'waiting';
  if (rows.some((r) => r.status === 'Done')) return 'happy';
  return 'calm';
}

// What the pet "says" under its face, in its own voice.
const DID_FOR_ME: Record<string, string> = {
  Feed: 'fed me',
  Walk: 'took me for a walk',
  Medication: 'gave me my medicine',
  Play: 'played with me',
  Groom: 'brushed me',
  Train: 'practiced tricks with me',
};

const MY_THING: Record<string, string> = {
  Feed: 'my food',
  Walk: 'my walk',
  Medication: 'my medicine',
  Play: 'playtime',
  Groom: 'my brushing',
  Train: 'training',
};

export function getPetLine(rows: CareRow[]): string {
  const done = [...rows].reverse().find((r) => r.status === 'Done');
  const open = rows.find((r) => r.status === 'Open');
  const next = rows.find((r) => r.status === 'Later');

  const didForMe = (r: CareRow) =>
    `${r.doneBy} ${DID_FOR_ME[r.schedule.activityType] ?? `did my ${r.schedule.activityType.toLowerCase()}`}`;
  const myThing = (r: CareRow) =>
    MY_THING[r.schedule.activityType] ?? r.schedule.activityType.toLowerCase();

  if (open && done) return `${didForMe(done)}, but I'm still waiting on ${myThing(open)}...`;
  if (open) return `I'm still waiting on ${myThing(open)}...`;
  if (done && next) return `${didForMe(done)}! Next up: ${myThing(next)}.`;
  if (done) return `${didForMe(done)}. Best day ever!`;
  if (next) return `Can't wait for ${myThing(next)}!`;
  return 'Hi! Spend some time with me today?';
}
