import { describe, expect, it } from "@jest/globals";

import { challengeSource, fetchChallenges } from "@/lib/challengesData";
import type { Challenge } from "@/types/firestore";
import {
  __seed,
  DocumentReference,
  Timestamp,
} from "../../../test/fakeFirestore";

const withSource = (generatedBy?: string) => ({ generatedBy }) as Challenge;

describe("challengeSource", () => {
  it("marks challenges written by the on-device AI", () => {
    expect(challengeSource(withSource("apple-foundation-models"))).toBe("ai");
  });

  it("marks challenges from the free preset list", () => {
    expect(challengeSource(withSource("free-preset"))).toBe("preset");
  });

  it("marks nothing for older or unknown challenges", () => {
    expect(challengeSource(withSource())).toBeNull();
    expect(challengeSource(withSource("something-else"))).toBeNull();
  });
});

describe("fetchChallenges", () => {
  it("keeps generatedBy so the screens can show the badge", async () => {
    const petRef = new DocumentReference("pets", "milo");
    const week = {
      petId: petRef,
      completionStatus: "in_progress",
      startDate: Timestamp.fromMillis(Date.now() - 86400000),
      endDate: Timestamp.fromMillis(Date.now() + 86400000),
      completedBy: [],
      participants: [],
      activityTypes: ["Walk"],
    };
    __seed("challenges", "ai1", {
      ...week,
      title: "AI walk",
      generatedBy: "apple-foundation-models",
    });
    __seed("challenges", "pre1", {
      ...week,
      title: "Preset walk",
      generatedBy: "free-preset",
    });

    const page = await fetchChallenges("milo");
    const sources = Object.fromEntries(
      page.active.map((c) => [c.title, challengeSource(c)]),
    );

    expect(sources).toEqual({ "AI walk": "ai", "Preset walk": "preset" });
  });
});
