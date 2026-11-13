import type { Memory } from "@/types/firestore";
import { activityLabel } from "@/lib/format";

/** Human-readable name; the underlying activityType stays "Other" for matching. */
export function memoryActivityName(memory: Pick<Memory, "activityType" | "customActivityName">): string {
  const custom = memory.customActivityName?.trim();
  return memory.activityType === "Other" && custom ? custom : activityLabel(memory.activityType);
}
