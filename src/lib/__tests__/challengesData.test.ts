import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { currentUserId } from "@/lib/auth";
import {
  challengeSource,
  createManualChallenge,
  fetchChallenges,
  isPetOwner,
  updateChallenge,
  type NewChallengeInput,
} from "@/lib/challengesData";
import { createFreePresetChallenges } from "@/lib/weeklyChallenges";
import type { Challenge } from "@/types/firestore";
import {
  __all,
  __get,
  __seed,
  DocumentReference,
  Timestamp,
} from "../../../test/fakeFirestore";

jest.mock("@/lib/auth", () => ({ currentUserId: jest.fn(() => "alex") }));

const PET = "milo";
const petRef = new DocumentReference("pets", PET);
const userRef = (id: string) => new DocumentReference("users", id);
const signedInAs = (id: string) =>
  jest.mocked(currentUserId).mockReturnValue(id);

beforeEach(() => {
  signedInAs("alex");
  for (const [id, role] of [
    ["alex", "owner"],
    ["emma", "member"],
  ]) {
    __seed("users", id, { name: id, email: `${id}@example.com` });
    __seed("userPets", `${PET}_${id}`, {
      petId: petRef,
      userId: userRef(id),
      role,
    });
  }
});

const withSource = (generatedBy?: string) => ({ generatedBy }) as Challenge;

describe("challengeSource", () => {
  it("marks challenges written by the on-device AI", () => {
    expect(challengeSource(withSource("apple-foundation-models"))).toBe("ai");
  });

  it("marks challenges from the free preset list", () => {
    expect(challengeSource(withSource("free-preset"))).toBe("preset");
  });

  it("marks challenges the owner made by hand", () => {
    expect(challengeSource(withSource("manual"))).toBe("custom");
  });

  it("marks nothing for older or unknown challenges", () => {
    expect(challengeSource(withSource())).toBeNull();
    expect(challengeSource(withSource("something-else"))).toBeNull();
  });
});

describe("fetchChallenges", () => {
  it("keeps generatedBy so the screens can show the badge", async () => {
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

    const page = await fetchChallenges(PET);
    const sources = Object.fromEntries(
      page.active.map((c) => [c.title, challengeSource(c)]),
    );

    expect(sources).toEqual({ "AI walk": "ai", "Preset walk": "preset" });
  });
});

describe("isPetOwner", () => {
  it("is true only for the family member with the owner role", async () => {
    expect(await isPetOwner(PET, "alex")).toBe(true);
    expect(await isPetOwner(PET, "emma")).toBe(false);
    expect(await isPetOwner(PET, "stranger")).toBe(false);
  });
});

const newChallenge = (
  overrides: Partial<NewChallengeInput> = {},
): NewChallengeInput => ({
  title: "Park twice",
  description: "Any park counts",
  goal: 2,
  participantIds: ["alex", "emma"],
  activityType: "Walk",
  goalType: "unique_activities",
  ...overrides,
});

describe("createManualChallenge", () => {
  it("lets the owner add an active challenge marked as custom", async () => {
    const id = await createManualChallenge(PET, newChallenge());
    const saved = __get("challenges", id)!;

    expect(saved).toMatchObject({
      petId: petRef,
      title: "Park twice",
      description: "Any park counts",
      goal: 2,
      goalType: "unique_activities",
      activityTypes: ["Walk"],
      participants: [userRef("alex"), userRef("emma")],
      progress: 0,
      completionStatus: "in_progress",
      pointReward: 100,
      generatedBy: "manual",
    });
    expect((saved.endDate as Timestamp).toMillis()).toBeGreaterThan(Date.now());
  });

  it("refuses family members who are not the owner", async () => {
    signedInAs("emma");
    await expect(createManualChallenge(PET, newChallenge())).rejects.toThrow(
      "Only the pet's owner",
    );
    expect(__all("challenges")).toHaveLength(0);
  });

  it.each([
    ["a too-short title", { title: "  a " }, "title"],
    ["a zero goal", { goal: 0 }, "goal"],
    ["nobody taking part", { participantIds: [] }, "at least one person"],
    ["an unknown counting type", { goalType: "points" }, "counted"],
  ])("rejects %s", async (_label, overrides, message) => {
    await expect(
      createManualChallenge(PET, newChallenge(overrides)),
    ).rejects.toThrow(message);
  });
});

describe("updateChallenge", () => {
  beforeEach(() => {
    __seed("challenges", "c1", {
      petId: petRef,
      title: "Take Milo for 3 walks",
      description: "",
      goal: 3,
      progress: 2,
      goalType: "unique_activities",
      activityTypes: ["Walk"],
      participants: [userRef("alex")],
      completedBy: [],
      pointReward: 150,
      completionStatus: "in_progress",
      startDate: Timestamp.now(),
      endDate: Timestamp.fromMillis(Date.now() + 86400000),
      generatedBy: "apple-foundation-models",
    });
  });

  const edits = {
    title: "Take Milo for 5 walks",
    description: "Longer ones count double in our hearts",
    goal: 5,
    participantIds: ["alex", "emma"],
  };

  it("changes the title, description, goal and who takes part", async () => {
    await updateChallenge("c1", edits);

    expect(__get("challenges", "c1")).toMatchObject({
      title: "Take Milo for 5 walks",
      description: "Longer ones count double in our hearts",
      goal: 5,
      participants: [userRef("alex"), userRef("emma")],
    });
  });

  it("keeps the activity, counting, points and progress", async () => {
    await updateChallenge("c1", edits);

    expect(__get("challenges", "c1")).toMatchObject({
      activityTypes: ["Walk"],
      goalType: "unique_activities",
      pointReward: 150,
      progress: 2,
      generatedBy: "apple-foundation-models",
    });
  });

  it("does not allow a goal at or below what is already done", async () => {
    await expect(updateChallenge("c1", { ...edits, goal: 2 })).rejects.toThrow(
      "more than the 2 already done",
    );
  });

  it("refuses family members who are not the owner", async () => {
    signedInAs("emma");
    await expect(updateChallenge("c1", edits)).rejects.toThrow(
      "Only the pet's owner",
    );
    expect(__get("challenges", "c1")?.title).toBe("Take Milo for 3 walks");
  });

  it("does not edit finished or cancelled challenges", async () => {
    __seed("challenges", "done", {
      ...__get("challenges", "c1"),
      completionStatus: "completed",
    });
    await expect(updateChallenge("done", edits)).rejects.toThrow(
      "Only active challenges",
    );
  });
});

describe("a new week of preset challenges", () => {
  it("keeps the owner's custom challenges running", async () => {
    __seed("pets", PET, { name: "Milo", species: "Dog" });
    __seed(`pets/${PET}/settings`, "challenges", {
      plan: "free",
      weeklyCount: 1,
    });
    const id = await createManualChallenge(PET, newChallenge());

    await createFreePresetChallenges(PET);

    expect(__get("challenges", id)?.completionStatus).toBe("in_progress");
  });
});
