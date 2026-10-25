import {
  generateApple,
  GenerationDiagnosticError,
  type GenerationAttempt,
} from "../src/apple";
import { PROMPT_VERSION } from "../src/apple";
import { scoreBatch } from "./scoring";
import type { Scenario } from "./scenarios";
export type EvalResult = {
  scenarioId: string;
  kind: string;
  repetition: number;
  startedAt: string;
  durationMs: number;
  passed: boolean;
  failures: string[];
  warnings: string[];
  error?: string;
  promptVersion: string;
  prompts: string[];
  rawResponses: unknown[];
  challenges: unknown[];
  context: Scenario["context"];
  availability?: string;
  attempts?: GenerationAttempt[];
  generationErrors?: string[];
};
export type EvalRun = {
  runId: string;
  seed: number;
  sampling: string;
  repetitions: number;
  scenarioCount: number;
  createdAt: string;
  results: EvalResult[];
  total: number;
  complete: boolean;
};
export async function evaluateOne(
  s: Scenario,
  repetition: number,
): Promise<EvalResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const base = {
    scenarioId: s.id,
    kind: s.kind,
    repetition,
    startedAt,
    promptVersion: PROMPT_VERSION,
    context: s.context,
  };
  if (s.expectedPreflightReject)
    return {
      ...base,
      durationMs: 0,
      passed: true,
      failures: [],
      warnings: ["Expected no eligible challenges: model call skipped"],
      prompts: [],
      rawResponses: [],
      challenges: [],
    };
  try {
    const record = await generateApple({petId:s.context.pet.id,petName:s.context.pet.name,petSpecies:s.context.pet.species,petBreed:s.context.pet.breed,petAgeYears:s.context.pet.ageYears,petRestrictions:s.context.pet.restrictions,weekStart:s.context.weekStart,verifiedMedicationPlan:s.context.verifiedMedicationPlan,weeklyCount:s.context.weeklyCount,preferences:s.context.preferences,recentChallenges:s.context.history.slice(-8).map(h=>({title:h.title,category:h.category,status:h.status,goalType:h.metricType === "count" || h.metricType === "group_sessions" ? "unique_activities" : h.metricType === "distinct_days" ? "daily" : h.metricType === "duration" ? "duration" : "unique_activities",goal:h.target,reason:h.reason}))});
    const score = scoreBatch(s, record.challenges);
    return {
      ...base,
      durationMs: Date.now() - start,
      passed: score.passed,
      failures: score.failures,
      warnings: [...score.warnings, ...record.errors],
      prompts: record.prompts,
      rawResponses: record.rawResponses,
      challenges: record.challenges,
      availability: record.availability,
      attempts: record.attempts,
      generationErrors: record.errors,
    };
  } catch (e) {
    const d =
      e instanceof GenerationDiagnosticError ? e.diagnostics : undefined;
    console.error("[Evaluation] generation failed:", e);
    return {
      ...base,
      durationMs: Date.now() - start,
      passed: false,
      failures: [],
      warnings: d?.errors ?? [],
      error: String(e),
      prompts: d?.prompts ?? [],
      rawResponses: d?.rawResponses ?? [],
      challenges: d?.challenges ?? [],
      availability: d?.availability,
      attempts: d?.attempts ?? [],
      generationErrors: d?.errors ?? [],
    };
  }
}
export function summarize(results: EvalResult[]) {
  const actual = results.filter((x) => x.prompts.length || x.error);
  const times = actual
    .filter((x) => !x.error)
    .map((x) => x.durationMs)
    .sort((a, b) => a - b);
  return {
    total: results.length,
    passed: results.filter((x) => x.passed).length,
    failed: results.filter((x) => !x.passed).length,
    modelRuns: actual.length,
    errors: results.filter((x) => x.error).length,
    medianLatencyMs: times.length ? times[Math.floor(times.length / 2)] : null,
  };
}
export function resultsCSV(results: EvalResult[]) {
  const esc = (x: unknown) => '"' + String(x ?? "").replace(/"/g, '""') + '"';
  const cols = [
    "scenarioId",
    "kind",
    "repetition",
    "startedAt",
    "durationMs",
    "passed",
    "error",
    "failures",
    "warnings",
    "promptVersion",
  ];
  return [
    cols.join(","),
    ...results.map((r) =>
      cols
        .map((k) =>
          esc(
            k === "failures" || k === "warnings"
              ? (r as any)[k].join(" | ")
              : (r as any)[k],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}
