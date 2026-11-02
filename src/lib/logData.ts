// Data access for the Log Activity screen. Backed by mock data for now; swap the bodies
// for Firestore calls later without touching the UI.
import * as mock from '@/data/mockData';
import { toDate } from '@/lib/homeData';
import { isSameDay } from '@/lib/format';
import { uploadImage } from '@/lib/storage';
import { dataVersionStore } from '@/lib/store';
import type { Memory, User } from '@/types/firestore';

/** Family for a pet: userPets by petId -> users. */
export async function fetchFamily(petId: string): Promise<User[]> {
  const ids = mock.userPets.filter((up) => up.petId === petId).map((up) => up.userId);
  return mock.users.filter((u) => ids.includes(u.userId));
}

/** points.action -> pointsGained, as numbers. */
export async function fetchPointsTable(): Promise<Record<string, number>> {
  return Object.fromEntries(mock.points.map((p) => [p.action, Number(p.pointsGained)]));
}

export type NewMemory = {
  petId: string;
  createdBy: string;
  activityType: string;
  occurredAt: Date;
  participants: string[];
  durationMinutes?: number;
  description?: string;
  /** Local image from the picker. Uploaded to Storage; only its path is saved. */
  localPhotoUri?: string;
  basePoints: number;
  bonusPoints: number;
};

/** Today's schedule for this activity that hasn't been logged yet, if any. */
function findScheduleToLink(petId: string, activityType: string, occurredAt: Date) {
  const loggedIds = new Set(
    mock.memories
      .filter((m) => m.petId === petId && isSameDay(toDate(m.occurredAt), occurredAt))
      .map((m) => m.careScheduleId),
  );
  return mock.careSchedules.find(
    (s) => s.petId === petId && s.activityType === activityType && !loggedIds.has(s.id),
  );
}

export async function createMemory(input: NewMemory): Promise<Memory> {
  const memoryId = `memory${Date.now()}`;
  // Upload first so a failed upload never leaves a memory pointing at a missing image.
  const photoPath = input.localPhotoUri
    ? await uploadImage(input.localPhotoUri, `memories/${memoryId}.jpg`)
    : undefined;

  const memory: Memory = {
    memoryId,
    petId: input.petId,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt.toISOString(),
    description: input.description ?? '',
    photoPath,
    activityType: input.activityType,
    participants: input.participants,
    careScheduleId: findScheduleToLink(input.petId, input.activityType, input.occurredAt)?.id,
    durationMinutes: input.durationMinutes,
    basePoints: input.basePoints,
    bonusPoints: input.bonusPoints,
  };
  mock.memories.push(memory);
  dataVersionStore.set(dataVersionStore.get() + 1);
  return memory;
}
