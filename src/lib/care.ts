import { toDate } from '@/lib/homeData';
import { formatScheduledTime, formatTime, isSameDay } from '@/lib/format';
import type { CareSchedule, Memory, User } from '@/types/firestore';

export type CareStatus = 'Done' | 'Open' | 'Later';

export type CareRow = { schedule: CareSchedule; status: CareStatus; subtitle: string };

// How the pet feels about today's care. Drives the animated face.
export type PetMood = 'happy' | 'waiting' | 'calm';

function partOfDay(hour: number): string {
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
    const done = todays.find((m) => m.careScheduleId === s.id);
    const [h, min] = s.scheduledTime.split(':').map(Number);
    const due = new Date(now);
    due.setHours(h, min, 0, 0);

    if (done) {
      return {
        schedule: s,
        status: 'Done',
        subtitle: `${formatTime(toDate(done.occurredAt))} · by ${usersById[done.createdBy]?.name ?? 'someone'}`,
      };
    }
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
