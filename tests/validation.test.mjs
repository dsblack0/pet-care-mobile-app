import { test } from "node:test";
import assert from "node:assert/strict";
import { sample, sampleChallenges } from "../src/fixtures.ts";
import {
  validateContext,
  validateChallenge,
  validateBatch,
  progress,
} from "../src/validation.ts";
const clone = (x) => structuredClone(x);
const first = () => clone(sampleChallenges[0]);
test("fixture batch validates", () =>
  assert.equal(
    validateBatch({ challenges: sampleChallenges }, sample).length,
    5,
  ));
test("JSON string parses", () =>
  assert.equal(
    validateChallenge(JSON.stringify(first()), sample).category,
    "walking",
  ));
test("markdown JSON fence parses", () =>
  assert.equal(
    validateChallenge("```json\n" + JSON.stringify(first()) + "\n```", sample)
      .category,
    "walking",
  ));
test("malformed JSON rejected", () =>
  assert.throws(() => validateChallenge("{bad", sample)));
test("unknown category rejected", () => {
  const c = first();
  c.category = "swimming";
  assert.throws(() => validateChallenge(c, sample));
});
test("disabled medication rejected", () => {
  const c = first();
  c.category = "medication";
  assert.throws(() => validateChallenge(c, sample));
});
test("unauthorized member rejected", () => {
  const c = first();
  c.participantIds = ["outsider"];
  assert.throws(() => validateChallenge(c, sample));
});
test("duplicate participant rejected", () => {
  const c = first();
  c.participantIds = ["alex", "alex"];
  assert.throws(() => validateChallenge(c, sample));
});
test("missing per-member ID rejected", () => {
  const c = first();
  c.metric.requiredMemberIds = ["alex", "outsider"];
  assert.throws(() => validateChallenge(c, sample));
});
test("impossible group size rejected", () => {
  const c = clone(sampleChallenges[3]);
  c.metric.minimumMembersPerSession = 4;
  assert.throws(() => validateChallenge(c, sample));
});
test("distinct days above seven rejected", () => {
  const c = clone(sampleChallenges[1]);
  c.metric.targetDays = 8;
  assert.throws(() => validateChallenge(c, sample));
});
test("wrong batch count rejected", () =>
  assert.throws(() => validateBatch({ challenges: [first()] }, sample)));
test("duplicate title rejected", () => {
  const a = clone(sampleChallenges);
  a[1].title = a[0].title;
  assert.throws(() => validateBatch({ challenges: a }, sample));
});
test("unknown preference member rejected", () => {
  const c = clone(sample);
  c.preferences[0].memberIds = ["ghost"];
  assert.throws(() => validateContext(c));
});
test("duplicate category preferences rejected", () => {
  const c = clone(sample);
  c.preferences[0].category = "walking";
  assert.throws(() => validateContext(c));
});
test("medication without plan rejected even if enabled", () => {
  const ctx = clone(sample);
  ctx.preferences[5].enabled = true;
  ctx.preferences[5].memberIds = ["alex"];
  const ch = {
    ...first(),
    category: "medication",
    participantIds: ["alex"],
    metric: { type: "count", target: 1 },
  };
  assert.throws(() => validateChallenge(ch, ctx));
});
test("medication dosage text rejected with plan", () => {
  const ctx = clone(sample);
  ctx.verifiedMedicationPlan = true;
  ctx.preferences[5].enabled = true;
  ctx.preferences[5].memberIds = ["alex"];
  const ch = {
    ...first(),
    category: "medication",
    participantIds: ["alex"],
    description: "Give an extra pill to Buddy after dinner.",
    metric: { type: "count", target: 1 },
  };
  assert.throws(() => validateChallenge(ch, ctx));
});
test("per-member progress counts unique qualified members", () => {
  const a = [
    {
      id: "a",
      category: "walking",
      date: "2026-10-26",
      memberIds: ["alex"],
      minutes: 10,
      verified: true,
    },
    {
      id: "b",
      category: "walking",
      date: "2026-10-27",
      memberIds: ["alex"],
      minutes: 10,
      verified: true,
    },
    {
      id: "c",
      category: "walking",
      date: "2026-10-28",
      memberIds: ["sam"],
      minutes: 10,
      verified: true,
    },
  ];
  assert.deepEqual(progress(first(), a), { value: 2, target: 3 });
});
test("distinct days deduplicated", () => {
  const a = [
    {
      id: "a",
      category: "feeding",
      date: "2026-10-26",
      memberIds: ["alex"],
      minutes: 0,
      verified: true,
    },
    {
      id: "b",
      category: "feeding",
      date: "2026-10-26",
      memberIds: ["sam"],
      minutes: 0,
      verified: true,
    },
  ];
  assert.deepEqual(progress(sampleChallenges[1], a), { value: 1, target: 7 });
});
test("group session needs distinct eligible members", () => {
  const a = [
    {
      id: "a",
      category: "play",
      date: "2026-10-26",
      memberIds: ["alex"],
      minutes: 30,
      verified: true,
    },
    {
      id: "b",
      category: "play",
      date: "2026-10-27",
      memberIds: ["alex", "sam"],
      minutes: 20,
      verified: true,
    },
  ];
  assert.deepEqual(progress(sampleChallenges[3], a), { value: 1, target: 3 });
});
test("duration sums minutes", () => {
  const a = [
    {
      id: "a",
      category: "play",
      date: "2026-10-26",
      memberIds: ["alex"],
      minutes: 30,
      verified: true,
    },
    {
      id: "b",
      category: "play",
      date: "2026-10-27",
      memberIds: ["sam"],
      minutes: 40,
      verified: true,
    },
  ];
  assert.deepEqual(progress(sampleChallenges[2], a), {
    value: 70,
    target: 120,
  });
});
