import { doc, GeoPoint, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { currentUserId } from "@/lib/auth";
import { getChallengesForPet, getLevels, getMemoriesForPet } from "@/lib/db";
import { resolveLocationForSave } from "@/lib/location";
import { challengeChanges, levelForTotal } from "@/lib/challengeAccounting";
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
  const [memories, challenges, levels] = await Promise.all([
    getMemoriesForPet(input.petId), getChallengesForPet(input.petId), getLevels(),
  ]);
  const previous = memories.find((m) => m.memoryId === input.memoryId);
  if (!previous) throw new Error("Memory not found.");
  if (previous.createdBy.id !== uid) throw new Error("Only the person who posted this memory can edit it.");
  if (!input.participants.includes(uid)) throw new Error("You must remain a participant.");
  if (input.occurredAt.getTime() > Date.now()) throw new Error("The activity cannot be in the future.");
  const locationLabel = await resolveLocationForSave(input.location);
  const basePoints = 0;
  const bonusPoints = input.participants.length > 1 ? 5 : 0;
  const oldPoints = Number(previous.bonusPoints ?? 0);
  const delta = bonusPoints - oldPoints;
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
    locationLabel,
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
    const changes = challengeChanges(challenges, revisedMemories);
    const challengeDelta = challengeSnaps.reduce((sum, snap) => {
      const change = changes.find(c => c.challenge.challengeId === snap.id);
      if (!snap.exists() || snap.data().completionStatus === "cancelled" || !change) return sum;
      return sum + (Number(change.complete) - Number(snap.data().completionStatus === "completed")) * Math.max(0, Number(snap.data().pointReward ?? 0));
    }, 0);
    const total = Math.max(0, Number(petSnap.data().totalPoints ?? 0) + delta + challengeDelta);
    const level = levelForTotal(levels, total);
    tx.update(memoryRef, update);
    tx.update(petRef, { totalPoints: total, level });
    for (const snap of challengeSnaps) {
      if (!snap.exists() || snap.data().completionStatus === "cancelled") continue;
      const challenge = challenges.find((c) => c.challengeId === snap.id)!;
      const change = changes.find(c => c.challenge.challengeId === snap.id);
      if (!change) continue;
      tx.update(snap.ref, {
        progress: change.progress, completedBy: change.completedBy.map(getUserReference),
        completionStatus: change.complete ? "completed" : "in_progress",
        completedAt: change.complete ? (snap.data().completedAt ?? Timestamp.now()) : null,
      });
    }
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
}
