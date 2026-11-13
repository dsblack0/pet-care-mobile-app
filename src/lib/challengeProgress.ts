/** Recalculate challenge progress from a pet's logged memories.
 * Keep the activity category as the matching key; custom Other names are display-only.
 */
import type { Challenge, Memory } from "@/types/firestore";
import { toDate } from "@/lib/homeData";

export function progressFromMemories(challenge: Challenge, memories: Memory[]) {
  const start = toDate(challenge.startDate).getTime();
  const end = toDate(challenge.endDate).getTime();
  const allowed = new Set(challenge.participants.map((p) => p.id));
  const matches = memories.filter((m) => {
    const time = toDate(m.occurredAt).getTime();
    return time >= start && time <= end &&
      (challenge.activityTypes.length === 0 || challenge.activityTypes.includes(m.activityType)) &&
      m.participants.some((p) => allowed.has(p.id));
  });
  const ids = new Set(matches.flatMap((m) => m.participants.map((p) => p.id).filter((id) => allowed.has(id))));
  const type = challenge.goalType;
  let progress: number;
  if (type === "minutes" || type === "duration") {
    progress = matches.reduce((sum, m) => sum + Math.max(0, m.durationMinutes ?? 0), 0);
  } else if (type === "daily") {
    progress = new Set(matches.map((m) => toDate(m.occurredAt).toISOString().slice(0, 10))).size;
  } else if (type === "unique_participants") {
    progress = ids.size;
  } else if (type === "shared_activities" || challenge.jointActivity) {
    progress = matches.filter((m) => m.participants.filter((p) => allowed.has(p.id)).length >= 2).length;
  } else {
    // Includes 'unique_activities' used by preset challenges.
    progress = matches.length;
  }
  return { progress, completedBy: [...ids] };
}
