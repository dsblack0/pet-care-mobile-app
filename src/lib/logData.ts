// Data access for the Log Activity screen, backed by Firestore. Memories are built with the
// team's models/ and firebaseServices/ helpers.
import {
  collection,
  doc,
  GeoPoint,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import {
  getFamily,
  getMemoriesForPet,
  getPoints,
  getSchedulesForPet,
} from "@/lib/db";
import { toDate } from "@/lib/homeData";
import { isSameDay } from "@/lib/format";
import { uploadImage } from "@/lib/storage";
import { dataVersionStore } from "@/lib/store";
import type { Memory, User } from "@/types/firestore";
import { db } from "../../firebaseConfig";
import {
  getCareScheduleReference,
  getPetReference,
  getUserReference,
} from "../../firebaseServices/memoriesService";
import { createMemory } from "../../models/memories";

/** Family for a pet: userPets by petId -> users. */
export async function fetchFamily(petId: string): Promise<User[]> {
  return getFamily(petId);
}

/** points.action -> pointsGained. */
export async function fetchPointsTable(): Promise<Record<string, number>> {
  return Object.fromEntries(
    (await getPoints()).map((p) => [p.action, p.pointsGained]),
  );
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
  /** Where it happened, if the user added their location. */
  location?: { latitude: number; longitude: number };
  basePoints: number;
  bonusPoints: number;
};

/** Today's schedule for this activity that hasn't been logged yet, if any. */
async function findScheduleToLink(
  petId: string,
  activityType: string,
  occurredAt: Date,
) {
  const [memories, schedules] = await Promise.all([
    getMemoriesForPet(petId),
    getSchedulesForPet(petId),
  ]);
  const loggedIds = new Set(
    memories
      .filter((m) => isSameDay(toDate(m.occurredAt), occurredAt))
      .map((m) => m.careScheduleId?.id),
  );
  return schedules.find(
    (s) => s.activityType === activityType && !loggedIds.has(s.careScheduleId),
  );
}

export async function logActivity(input: LogActivityInput): Promise<Memory> {
  // A new Firestore document id, generated locally, so the photo can be named after it.
  const memoryId = doc(collection(db, "memories")).id;

  // Upload first so a failed upload never leaves a memory pointing at a missing image.
  const photoPath = input.localPhotoUri
    ? await uploadImage(input.localPhotoUri, `memories/${memoryId}.jpg`)
    : null;

  const schedule = await findScheduleToLink(
    input.petId,
    input.activityType,
    input.occurredAt,
  );

  const newMemory = createMemory(
    getPetReference(input.petId),
    getUserReference(input.createdBy),
    Timestamp.fromDate(input.occurredAt),
    input.description ?? "",
    input.activityType,
    input.participants.map(getUserReference),
    photoPath,
    input.location
      ? new GeoPoint(input.location.latitude, input.location.longitude)
      : null,
    schedule ? getCareScheduleReference(schedule.careScheduleId) : null,
    input.durationMinutes ?? null,
    input.basePoints,
    input.bonusPoints,
  );

  // setDoc (not saveMemory's addDoc) so the document uses the id the photo is named after.
  await setDoc(doc(db, "memories", memoryId), newMemory);
  const memory: Memory = { memoryId, ...newMemory };
  dataVersionStore.set(dataVersionStore.get() + 1);
  return memory;
}
