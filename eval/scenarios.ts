import { CATEGORIES, type ContextType } from "../src/schema";
import { sample } from "../src/fixtures";
import { validateContext } from "../src/validation";

export type Sampling = "balanced" | "random" | "edge";
export type Scenario = {
  id: string;
  kind: string;
  context: ContextType;
  expectedPreflightReject: boolean;
  seed: number;
};
export type ScenarioOptions = {
  seed: number;
  count: number;
  sampling: Sampling;
};
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = <T>(r: () => number, xs: readonly T[]): T =>
  xs[Math.floor(r() * xs.length)];
export function generateScenarios({
  seed,
  count,
  sampling,
}: ScenarioOptions): Scenario[] {
  if (
    !Number.isInteger(seed) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 500
  )
    throw Error("Invalid seed or scenario count (1-500)");
  const r = rng(seed);
  const result: Scenario[] = [];
  for (let i = 0; i < count; i++) {
    const c: ContextType = JSON.parse(JSON.stringify(sample));
    const kind =
      sampling === "edge"
        ? pick(r, [
            "none-enabled",
            "medication-unverified",
            "one-member",
            "many-cancellations",
            "senior",
            "long-history",
          ])
        : sampling === "balanced"
          ? [
              "baseline",
              "none-enabled",
              "single-category",
              "family-split",
              "all-canceled",
              "all-completed",
              "mixed",
              "senior",
              "medication-unverified",
              "long-history",
            ][i % 10]
          : "random";
    const familySize = kind === "one-member" ? 1 : 1 + Math.floor(r() * 5);
    c.members = Array.from({ length: familySize }, (_, j) => ({
      id: `member${j + 1}`,
      name: `Member ${j + 1}`,
    }));
    c.pet = {
      id: `pet${i}`,
      name: `Test Pet ${i + 1}`,
      species: pick(r, ["dog", "cat"] as const),
      ageYears: kind === "senior" ? 14 : Math.floor(r() * 15) + 1,
      breed: r() < 0.7 ? (r() < 0.5 ? "Golden Retriever" : "Mixed breed") : undefined,
      restrictions:
        kind === "senior"
          ? ["mobility limitations"]
          : r() < 0.15
            ? ["limited exercise"]
            : [],
    };
    c.weeklyCount = 5;
    c.verifiedMedicationPlan = r() < 0.25;
    const single = pick(r, CATEGORIES);
    c.preferences = CATEGORIES.map((category, j) => {
      let enabled =
        kind === "none-enabled"
          ? false
          : kind === "single-category"
            ? category === single
            : kind === "medication-unverified"
              ? category === "medication"
              : sampling === "balanced" && kind === "baseline"
                ? category !== "medication"
                : r() < 0.55;
      if (category === "medication" && kind === "medication-unverified")
        c.verifiedMedicationPlan = false;
      const memberIds = c.members
        .filter((_, k) =>
          kind === "family-split" ? k === j % familySize : r() < 0.7,
        )
        .map((m) => m.id);
      if (enabled && !memberIds.length) memberIds.push(pick(r, c.members).id);
      return { category, enabled, memberIds: enabled ? memberIds : [] };
    });
    const length =
      kind === "long-history"
        ? 50
        : kind === "baseline"
          ? 5
          : Math.floor(r() * 16);
    c.history = Array.from({ length }, (_, j) => {
      const category = pick(r, CATEGORIES);
      const status =
        kind === "all-canceled" || kind === "many-cancellations"
          ? "canceled"
          : kind === "all-completed"
            ? "completed"
            : pick(r, ["completed", "canceled"] as const);
      const metricType = pick(r, [
        "count",
        "duration",
        "distinct_days",
        "group_sessions",
      ]);
      const target = metricType === "duration"
        ? 30 + Math.floor(r() * 4) * 30
        : metricType === "distinct_days" ? 2 + Math.floor(r() * 6)
        : 2 + Math.floor(r() * 4);
      const name = c.pet.name;
      const unit = metricType === "duration" ? "duration" : metricType === "distinct_days" ? "daily" : "unique_activities";
      const verb: Record<string, string> = {
        feeding: `Log ${name}'s feeding`,
        walking: `Walk ${name}`,
        training: `Practice training with ${name}`,
        play: `Play with ${name}`,
        grooming: `Groom ${name}`,
        medication: `Log ${name}'s prescribed medication`,
      };
      const title = unit === "duration"
        ? `Spend ${target} minutes on ${category} with ${name} this week`
        : unit === "daily"
          ? `${verb[category]} on ${target} different days this week`
          : category === "walking"
            ? `Take ${name} for ${target} walks this week`
            : category === "training"
              ? `Complete ${target} training sessions with ${name} this week`
              : category === "play"
                ? `Complete ${target} play sessions with ${name} this week`
                : category === "grooming"
                  ? `Complete ${target} grooming sessions for ${name} this week`
                  : category === "feeding"
                    ? `Log ${target} meals for ${name} this week`
                    : `Log ${target} prescribed medication doses for ${name} this week`;
      return {
        id: `history${j}`,
        category,
        title,
        status,
        metricType,
        target,
        week: `2026-09-${String(1 + (j % 28)).padStart(2, "0")}`,
        reason:
          status === "canceled" && r() < 0.35 ? "Not enough time" : undefined,
      };
    });
    validateContext(c);
    const eligible = c.preferences.some(
      (p) =>
        p.enabled &&
        p.memberIds.length &&
        (p.category !== "medication" || c.verifiedMedicationPlan),
    );
    result.push({
      id: `S${String(i + 1).padStart(3, "0")}`,
      kind,
      context: c,
      expectedPreflightReject: !eligible,
      seed,
    });
  }
  return result;
}
