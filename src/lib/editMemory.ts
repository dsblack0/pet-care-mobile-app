import { doc, GeoPoint, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { currentUserId } from "@/lib/auth";
import { getChallengesForPet, getLevels, getMemoriesForPet, getPoints } from "@/lib/db";
import { progressFromMemories } from "@/lib/challengeProgress";
import { uploadImage } from "@/lib/storage";
import { dataVersionStore } from "@/lib/store";
import { getUserReference } from "../../firebaseServices/memoriesService";
import type { Memory } from "@/types/firestore";

export type MemoryChanges = {
  petId: string;
  memoryId: string;
  activityType: string;
  customActivityName: string;
  description: string;
  occurredAt: Date;
  durationMinutes: number | null;
  participants: string[];
  location: { latitude: number; longitude: number; label?: string } | null;
  photoUri?: string | null;
  removePhoto?: boolean;
};

/** Edit an existing activity without awarding its points twice. */
export async function editMemory(input: MemoryChanges) {
  const uid = currentUserId();
  const [memories, challenges, levels, pointRows] = await Promise.all([
    getMemoriesForPet(input.petId), getChallengesForPet(input.petId), getLevels(), getPoints(),
  ]);
  const previous = memories.find((m) => m.memoryId === input.memoryId);
  if (!previous) throw new Error("Memory not found.");
  if (previous.createdBy.id !== uid) throw new Error("Only the person who posted this memory can edit it.");
  if (!input.participants.includes(uid)) throw new Error("You must remain a participant.");
  if (input.occurredAt.getTime() > Date.now()) throw new Error("The activity cannot be in the future.");
  const points = Object.fromEntries(pointRows.map((p) => [p.action, p.pointsGained]));
  const basePoints = Number(points[input.activityType] ?? 0);
  const bonusPoints = input.participants.length > 1 ? Number(points.TogetherBonus ?? 0) : 0;
  const oldPoints = Number(previous.basePoints ?? 0) + Number(previous.bonusPoints ?? 0);
  const delta = basePoints + bonusPoints - oldPoints;
  // A replacement photo is uploaded before the transaction. Existing photos are kept by default.
  const photoPath = input.photoUri ? await uploadImage(input.photoUri, `memories/${input.memoryId}-edit-${Date.now()}.jpg`) : input.removePhoto ? null : previous.photoPath;
  const update = {
    activityType: input.activityType,
    customActivityName: input.activityType === "Other" ? input.customActivityName.trim() : null,
    description: input.description,
    occurredAt: Timestamp.fromDate(input.occurredAt),
    durationMinutes: input.durationMinutes,
    participants: input.participants.map(getUserReference),
    location: input.location ? new GeoPoint(input.location.latitude, input.location.longitude) : null,
    locationLabel: input.location?.label ?? null,
    photoPath,
    basePoints,
    bonusPoints,
  };
  const revised = { ...previous, ...update } as Memory;
  const revisedMemories = memories.map((m) => m.memoryId === input.memoryId ? revised : m);
  await runTransaction(db, async (tx) => {
    const memoryRef = doc(db, "memories", input.memoryId);
    const petRef = doc(db, "pets", input.petId);
    const challengeRefs = challenges.filter((c) => c.completionStatus !== "cancelled").map((c) => doc(db, "challenges", c.challengeId));
    const [memorySnap, petSnap, ...challengeSnaps] = await Promise.all([
      tx.get(memoryRef), tx.get(petRef), ...challengeRefs.map((ref) => tx.get(ref)),
    ]);
    if (!memorySnap.exists() || memorySnap.data().createdBy?.id !== uid) throw new Error("Only the creator can edit this memory.");
    if (memorySnap.data().petId?.id !== input.petId) throw new Error("Memory belongs to a different pet.");
    if (!petSnap.exists()) throw new Error("Pet not found.");
    const total = Math.max(0, Number(petSnap.data().totalPoints ?? 0) + delta);
    let level = 1;
    for (const entry of levels) if (entry.nextLevelPoints > 0 && total >= entry.nextLevelPoints) level = Math.max(level, entry.levelNum + 1);
    tx.update(memoryRef, update);
    tx.update(petRef, { totalPoints: total, level });
    for (const snap of challengeSnaps) {
      if (!snap.exists() || snap.data().completionStatus === "cancelled") continue;
      const challenge = challenges.find((c) => c.challengeId === snap.id)!;
      const { progress, completedBy } = progressFromMemories(challenge, revisedMemories);
      const complete = progress >= challenge.goal;
      tx.update(snap.ref, {
        progress, completedBy: completedBy.map(getUserReference),
        completionStatus: complete ? "completed" : "in_progress",
        completedAt: complete ? (snap.data().completedAt ?? Timestamp.now()) : null,
      });
    }
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
}
