import { sample } from "../src/fixtures";
import type { ContextType } from "../src/schema";
const copy = () => structuredClone(sample);
export type EvalCase = {
  id: string;
  description: string;
  context: ContextType;
  expectation: string;
};
export const cases: EvalCase[] = [
  {
    id: "E01",
    description: "Baseline mixed history",
    context: copy(),
    expectation: "five valid varied challenges using history",
  },
  {
    id: "E02",
    description: "Feeding only",
    context: (() => {
      const c = copy();
      c.preferences.forEach((p) => (p.enabled = p.category === "feeding"));
      c.weeklyCount = 2;
      return c;
    })(),
    expectation: "feeding only",
  },
  {
    id: "E03",
    description: "Walking assigned to Alex only",
    context: (() => {
      const c = copy();
      c.preferences.find((p) => p.category === "walking")!.memberIds = ["alex"];
      return c;
    })(),
    expectation: "no unauthorized walking participants",
  },
  {
    id: "E04",
    description: "Canceled 180-minute play target",
    context: (() => {
      const c = copy();
      c.weeklyCount = 3;
      return c;
    })(),
    expectation: "avoid unexplained escalation of play target",
  },
  {
    id: "E05",
    description: "No medication plan",
    context: (() => {
      const c = copy();
      c.preferences.find((p) => p.category === "medication")!.enabled = true;
      c.preferences.find((p) => p.category === "medication")!.memberIds = [
        "alex",
      ];
      return c;
    })(),
    expectation: "no medication instructions",
  },
  {
    id: "E06",
    description: "All categories disabled",
    context: (() => {
      const c = copy();
      c.preferences.forEach((p) => (p.enabled = false));
      return c;
    })(),
    expectation: "preflight rejection; no LLM call",
  },
  {
    id: "E07",
    description: "Group play for two members",
    context: (() => {
      const c = copy();
      c.preferences.find((p) => p.category === "play")!.memberIds = [
        "alex",
        "sam",
      ];
      return c;
    })(),
    expectation: "group size at most two",
  },
  {
    id: "E08",
    description: "Senior dog with mobility restrictions",
    context: (() => {
      const c = copy();
      c.pet.ageYears = 14;
      c.pet.restrictions = ["mobility limitations"];
      return c;
    })(),
    expectation: "gentle feasible activities",
  },
  {
    id: "E09",
    description: "Cat with walking disabled",
    context: (() => {
      const c = copy();
      c.pet.species = "cat";
      c.preferences.find((p) => p.category === "walking")!.enabled = false;
      return c;
    })(),
    expectation: "cat appropriate enabled challenges",
  },
  {
    id: "E10",
    description: "Three canceled training challenges",
    context: (() => {
      const c = copy();
      c.history.push(
        ...[1, 2, 3].map((i) => ({
          id: "tc" + i,
          category: "training" as const,
          title: "Daily training " + i,
          status: "canceled" as const,
          metricType: "distinct_days",
          target: 7,
          week: "2026-10-0" + i,
        })),
      );
      return c;
    })(),
    expectation: "avoid daily training escalation",
  },
  {
    id: "E11",
    description: "Only grooming, one member",
    context: (() => {
      const c = copy();
      c.preferences.forEach((p) => (p.enabled = p.category === "grooming"));
      c.weeklyCount = 1;
      return c;
    })(),
    expectation: "Sam only",
  },
  {
    id: "E12",
    description: "Only play, multiple group sessions",
    context: (() => {
      const c = copy();
      c.preferences.forEach((p) => (p.enabled = p.category === "play"));
      c.weeklyCount = 3;
      return c;
    })(),
    expectation: "varied play challenges",
  },
  {
    id: "E13",
    description: "Feeding completed repeatedly",
    context: (() => {
      const c = copy();
      c.history.push(
        ...[1, 2].map((i) => ({
          id: "f" + i,
          category: "feeding" as const,
          title: "Log feeding daily",
          status: "completed" as const,
          metricType: "distinct_days",
          target: 7,
          week: "2026-10-0" + i,
        })),
      );
      return c;
    })(),
    expectation: "acknowledge stable routine",
  },
  {
    id: "E14",
    description: "Medication enabled with verified plan",
    context: (() => {
      const c = copy();
      c.verifiedMedicationPlan = true;
      c.preferences.find((p) => p.category === "medication")!.enabled = true;
      c.preferences.find((p) => p.category === "medication")!.memberIds = [
        "alex",
      ];
      return c;
    })(),
    expectation: "tracking only, never invent prescriptions",
  },
  {
    id: "E15",
    description: "Five requests, two eligible categories",
    context: (() => {
      const c = copy();
      c.preferences.forEach(
        (p) => (p.enabled = ["walking", "feeding"].includes(p.category)),
      );
      return c;
    })(),
    expectation: "five challenges, no other categories",
  },
];
