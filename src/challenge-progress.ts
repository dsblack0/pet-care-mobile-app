
import type { FirebaseChallenge } from './apple';

export type ActivityLog = {
  activityId: string;
  petId: string;
  activityType: string;
  timestamp: string;
  loggedBy: string;
  additionalParticipants: string[];
  durationMinutes?: number;
};

export function calculateChallengeProgress(
  challenge: FirebaseChallenge,
  logs: ActivityLog[]
): number {
  const eligible = new Set(challenge.participants);
  const countedIds = new Set<string>();

  const qualifying = logs.filter(log => {
    if (log.petId !== challenge.petId) return false;

    if (
      !challenge.activityTypes.includes(log.activityType)
    ) {
      return false;
    }

    const time = Date.parse(log.timestamp);

    if (
      !Number.isFinite(time) ||
      time < Date.parse(challenge.startDate) ||
      time > Date.parse(challenge.endDate)
    ) {
      return false;
    }

    const people = new Set([
      log.loggedBy,
      ...log.additionalParticipants,
    ]);

    const eligiblePeople = [...people].filter(
      id => eligible.has(id)
    );

    if (eligiblePeople.length === 0) return false;

    if (
      challenge.jointActivity &&
      eligiblePeople.length < 2
    ) {
      return false;
    }

    if (countedIds.has(log.activityId)) return false;

    countedIds.add(log.activityId);
    return true;
  });

  switch (challenge.goalType) {
    case 'unique_participants': {
      const participants = new Set<string>();

      for (const log of qualifying) {
        for (const id of [
          log.loggedBy,
          ...log.additionalParticipants,
        ]) {
          if (eligible.has(id)) {
            participants.add(id);
          }
        }
      }

      return Math.min(participants.size, challenge.goal);
    }

    case 'duration': {
      const minutes = qualifying.reduce(
        (sum, log) =>
          sum + Math.max(0, log.durationMinutes ?? 0),
        0
      );

      return Math.min(minutes, challenge.goal);
    }

    case 'unique_activities':
      return Math.min(qualifying.length, challenge.goal);

    case 'daily': {
      const days = new Set(
        qualifying.map(log =>
          new Date(log.timestamp)
            .toISOString()
            .slice(0, 10)
        )
      );

      return Math.min(days.size, challenge.goal);
    }
  }
}

export function isChallengeComplete(
  challenge: FirebaseChallenge,
  logs: ActivityLog[]
): boolean {
  return (
    calculateChallengeProgress(challenge, logs) >=
    challenge.goal
  );
}
