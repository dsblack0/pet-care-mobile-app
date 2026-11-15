// Data access for the Log Activity screen, backed by Firestore. Memories are built with the
// team's models/ and firebaseServices/ helpers.
import {
  collection,
  doc,
  GeoPoint,
  Timestamp,
  runTransaction,
} from "firebase/firestore";

import {
  getFamily,
  getMemoriesForPet,
  getPoints,
  getLevels,
  getChallengesForPet,
  getSchedulesForPet,
} from "@/lib/db";
import { progressFromMemories } from "@/lib/challengeProgress";
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
  customActivityName?: string;
  description?: string;
  /** Local image from the picker. Uploaded to Storage; only its path is saved. */
  localPhotoUri?: string;
  /** Where it happened, if the user added their location. */
  location?: { latitude: number; longitude: number; label?: string };
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

  // Commit the memory and the family point/level change atomically.
  // Re-running a failed transaction never awards points without the memory.
  const [levels, existingMemories, challenges] = await Promise.all([
    getLevels(), getMemoriesForPet(input.petId), getChallengesForPet(input.petId),
  ]);
  const earned = Math.max(0, input.basePoints + input.bonusPoints);
  await runTransaction(db, async (tx) => {
    const petDocument = doc(db, "pets", input.petId);
    const petSnapshot = await tx.get(petDocument);
    const challengeDocs = await Promise.all(challenges.filter((c) => c.completionStatus === "in_progress").map((c) => tx.get(doc(db, "challenges", c.challengeId))));
    if (!petSnapshot.exists()) throw new Error("Pet no longer exists.");
    const newTotal = Number(petSnapshot.data().totalPoints ?? 0) + earned;
    const eligible = levels.filter((level) => newTotal >= level.nextLevelPoints && level.nextLevelPoints > 0);
    const nextLevel = Math.max(Number(petSnapshot.data().level ?? 1), ...eligible.map((level) => level.levelNum + 1), 1);
    tx.set(doc(db, "memories", memoryId), {
      ...newMemory,
      ...(input.customActivityName ? { customActivityName: input.customActivityName } : {}),
      ...(input.location?.label ? { locationLabel: input.location.label } : {}),
    });
    tx.update(petDocument, { totalPoints: newTotal, level: nextLevel });
    const allMemories = [...existingMemories, { memoryId, ...newMemory } as Memory];
    for (const snapshot of challengeDocs) {
      if (!snapshot.exists() || snapshot.data().completionStatus !== "in_progress") continue;
      const challenge = challenges.find((c) => c.challengeId === snapshot.id)!;
      const { progress, completedBy } = progressFromMemories(challenge, allMemories);
      const goalMet = progress >= challenge.goal;
      tx.update(snapshot.ref, {
        progress,
        completedBy: completedBy.map(getUserReference),
        ...(goalMet ? { completionStatus: "completed", completedAt: Timestamp.now() } : {}),
      });
    }
  });
  const memory: Memory = { memoryId, ...newMemory };
  dataVersionStore.set(dataVersionStore.get() + 1);
  return memory;
}
