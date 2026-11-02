// Data access for the Log Activity screen. Memories are built with the team's models/ and
// firebaseServices/ helpers. Reads and the final save still use mock data until Firestore is
// seeded; then swap the mock push for saveMemory().
import { collection, doc, Timestamp } from 'firebase/firestore';

import * as mock from '@/data/mockData';
import { toDate } from '@/lib/homeData';
import { isSameDay } from '@/lib/format';
import { uploadImage } from '@/lib/storage';
import { dataVersionStore } from '@/lib/store';
import type { Memory, User } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import {
  getCareScheduleReference,
  getPetReference,
  getUserReference,
} from '../../firebaseServices/memoriesService';
import { createMemory } from '../../models/memories';

/** Family for a pet: userPets by petId -> users. */
export async function fetchFamily(petId: string): Promise<User[]> {
  const ids = mock.userPets.filter((up) => up.petId.id === petId).map((up) => up.userId.id);
  return mock.users.filter((u) => ids.includes(u.userId));
}

/** points.action -> pointsGained. */
export async function fetchPointsTable(): Promise<Record<string, number>> {
  return Object.fromEntries(mock.points.map((p) => [p.action, p.pointsGained]));
}

/** What the Log Activity form collects. IDs are plain strings; refs are made here. */
export type LogActivityInput = {
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
      .filter((m) => m.petId.id === petId && isSameDay(toDate(m.occurredAt), occurredAt))
      .map((m) => m.careScheduleId?.id),
  );
  return mock.careSchedules.find(
    (s) =>
      s.petId.id === petId && s.activityType === activityType && !loggedIds.has(s.careScheduleId),
  );
}

export async function logActivity(input: LogActivityInput): Promise<Memory> {
  // A new Firestore document id, generated locally, so the photo can be named after it.
  const memoryId = doc(collection(db, 'memories')).id;

  // Upload first so a failed upload never leaves a memory pointing at a missing image.
  const photoPath = input.localPhotoUri
    ? await uploadImage(input.localPhotoUri, `memories/${memoryId}.jpg`)
    : null;

  const schedule = findScheduleToLink(input.petId, input.activityType, input.occurredAt);

  const newMemory = createMemory(
    getPetReference(input.petId),
    getUserReference(input.createdBy),
    Timestamp.fromDate(input.occurredAt),
    input.description ?? '',
    input.activityType,
    input.participants.map(getUserReference),
    photoPath,
    null,
    schedule ? getCareScheduleReference(schedule.careScheduleId) : null,
    input.durationMinutes ?? null,
    input.basePoints,
    input.bonusPoints,
  );

  const memory: Memory = { memoryId, ...newMemory };
  mock.memories.push(memory);
  dataVersionStore.set(dataVersionStore.get() + 1);
  return memory;
}
