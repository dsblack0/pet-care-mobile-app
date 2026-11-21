import { doc, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { currentUserId } from "@/lib/auth";
import { getChallengesForPet, getLevels, getMemoriesForPet } from "@/lib/db";
import { challengeChanges, levelForTotal } from "@/lib/challengeAccounting";
import { dataVersionStore } from "@/lib/store";
import { getUserReference } from "../../firebaseServices/memoriesService";

/** Deletes only memories posted by the current user, reversing their activity points. */
export async function deleteMemory(petId: string, memoryId: string) {
  const [memories, challenges, levels] = await Promise.all([
    getMemoriesForPet(petId), getChallengesForPet(petId), getLevels(),
  ]);
  const memory = memories.find((m) => m.memoryId === memoryId);
  if (!memory) throw new Error("Memory not found.");
  if (memory.createdBy.id !== currentUserId()) throw new Error("Only the person who posted this memory can delete it.");
  const remaining = memories.filter((m) => m.memoryId !== memoryId);
  await runTransaction(db, async (tx) => {
    const memoryRef = doc(db, "memories", memoryId);
    const petRef = doc(db, "pets", petId);
    const [memorySnapshot, petSnapshot, ...challengeSnapshots] = await Promise.all([
      tx.get(memoryRef), tx.get(petRef),
      ...challenges.filter((c) => c.completionStatus !== "cancelled").map((c) => tx.get(doc(db, "challenges", c.challengeId))),
    ]);
    if (!memorySnapshot.exists()) throw new Error("Memory has already been deleted.");
    if (memorySnapshot.data().createdBy?.id !== currentUserId()) throw new Error("Only the person who posted this memory can delete it.");
    if (!petSnapshot.exists()) throw new Error("Pet not found.");
    const d = memorySnapshot.data();
    const points = Number(d.bonusPoints ?? 0);
    const changes = challengeChanges(challenges, remaining);
    const challengeDelta = challengeSnapshots.reduce((sum, snap) => {
      const change = changes.find(c => c.challenge.challengeId === snap.id);
      if (!snap.exists() || snap.data().completionStatus === "cancelled" || !change) return sum;
      return sum + (Number(change.complete) - Number(snap.data().completionStatus === "completed")) * Math.max(0, Number(snap.data().pointReward ?? 0));
    }, 0);
    const totalPoints = Math.max(0, Number(petSnapshot.data().totalPoints ?? 0) - points + challengeDelta);
    const level = levelForTotal(levels, totalPoints);
    tx.delete(memoryRef);
    tx.update(petRef, { totalPoints, level });
    for (const snapshot of challengeSnapshots) {
      if (!snapshot.exists() || snapshot.data().completionStatus === "cancelled") continue;
      const challenge = challenges.find((c) => c.challengeId === snapshot.id)!;
      const change = changes.find(c => c.challenge.challengeId === snapshot.id);
      if (!change) continue;
      tx.update(snapshot.ref, {
        progress: change.progress, completedBy: change.completedBy.map(getUserReference),
        completionStatus: change.complete ? "completed" : "in_progress",
        completedAt: change.complete ? (snapshot.data().completedAt ?? Timestamp.now()) : null,
      });
    }
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
}
