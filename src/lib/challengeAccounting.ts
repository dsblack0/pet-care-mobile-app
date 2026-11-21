import type { Challenge, Level, Memory } from "@/types/firestore";
import { progressFromMemories } from "@/lib/challengeProgress";

/** A challenge pays its reward while complete; reversing completion reverses the reward. */
export function challengeChanges(challenges: Challenge[], memories: Memory[]) {
  return challenges.filter(c => c.completionStatus !== "cancelled").map(challenge => {
    const { progress, completedBy } = progressFromMemories(challenge, memories);
    const complete = progress >= challenge.goal;
    const wasComplete = challenge.completionStatus === "completed";
    return { challenge, progress, completedBy, complete,
      pointDelta: (Number(complete) - Number(wasComplete)) * Math.max(0, Number(challenge.pointReward ?? 0)) };
  });
}

export function levelForTotal(levels: Level[], total: number): number {
  let level = 1;
  for (const entry of levels) if (entry.nextLevelPoints > 0 && total >= entry.nextLevelPoints)
    level = Math.max(level, entry.levelNum + 1);
  return level;
}
