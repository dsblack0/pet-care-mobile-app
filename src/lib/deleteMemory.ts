import { doc, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { currentUserId } from "@/lib/auth";
import { getChallengesForPet, getLevels, getMemoriesForPet } from "@/lib/db";
import { progressFromMemories } from "@/lib/challengeProgress";
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
    const points = Math.max(0, Number(d.basePoints ?? 0) + Number(d.bonusPoints ?? 0));
    const totalPoints = Math.max(0, Number(petSnapshot.data().totalPoints ?? 0) - points);
    let level = 1;
    for (const entry of levels) if (entry.nextLevelPoints > 0 && totalPoints >= entry.nextLevelPoints) level = Math.max(level, entry.levelNum + 1);
    tx.delete(memoryRef);
    tx.update(petRef, { totalPoints, level });
    for (const snapshot of challengeSnapshots) {
      if (!snapshot.exists() || snapshot.data().completionStatus === "cancelled") continue;
      const challenge = challenges.find((c) => c.challengeId === snapshot.id)!;
      const { progress, completedBy } = progressFromMemories(challenge, remaining);
      const complete = progress >= challenge.goal;
      tx.update(snapshot.ref, {
        progress, completedBy: completedBy.map(getUserReference),
        completionStatus: complete ? "completed" : "in_progress",
        completedAt: complete ? (snapshot.data().completedAt ?? Timestamp.now()) : null,
      });
    }
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
}
