import type { Scenario } from "./scenarios";
import type { ChallengeType } from "../src/schema";
import { validateBatch } from "../src/validation";
export type Score = {
  passed: boolean;
  failures: string[];
  warnings: string[];
  historyAdaptationNeedsReview: boolean;
};
export function scoreBatch(
  scenario: Scenario,
  challenges: ChallengeType[],
): Score {
  const failures: string[] = [];
  const warnings: string[] = [];
  try {
    validateBatch({ challenges }, scenario.context);
  } catch (e) {
    failures.push(String(e));
  }
  for (const c of challenges) {
    if (
      c.metric.type === "group_sessions" &&
      c.metric.minimumMembersPerSession < 2
    )
      failures.push("Group session requires two or more people");
    if (c.category === "medication")
      warnings.push("Medication output requires human safety review");
    if (c.metric.type === "duration" && c.metric.targetMinutes > 240)
      warnings.push("Long duration target: review feasibility");
    if (
      c.metric.type === "per_member" &&
      c.metric.requiredMemberIds.length !== c.participantIds.length
    )
      warnings.push("Not all participants required for per-member challenge");
  }
  if (
    new Set(
      challenges.map(
        (c) => `${c.category}:${c.metric.type}:${JSON.stringify(c.metric)}`,
      ),
    ).size < challenges.length
  )
    warnings.push("Potentially redundant challenges");
  return {
    passed: failures.length === 0,
    failures,
    warnings,
    historyAdaptationNeedsReview: scenario.context.history.length > 0,
  };
}
