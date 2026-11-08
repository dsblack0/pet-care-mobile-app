import { Platform } from "react-native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getChallengeSettings } from "@/lib/challengePlans";
import { fetchChallengePreferences } from "@/lib/challengePreferencesData";
import {
  getChallengesForPet,
  getPet,
  getUserPetsForPet,
  petRef,
  userRef,
} from "@/lib/db";
import { dataVersionStore } from "@/lib/store";
import type {
  GenerationInput,
  Category,
  GoalType,
} from "@/lib/appleChallengeEngine";

const categories: Record<string, Category> = {
  Feed: "feeding",
  Walk: "walking",
  Train: "training",
  Play: "play",
  Groom: "grooming",
  Medication: "medication",
};
function sundayUTC(now: Date) {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
function weekEnd(start: string) {
  return new Date(Date.parse(start + "T00:00:00.000Z") + 7 * 86400000 - 1);
}
function stateRef(petId: string) {
  return doc(db, "pets", petId, "challengeWeeks", "current");
}
const statusError = "Feature not available on Android";
export async function regenerateFamilyChallenges(
  petId: string,
  manual = true,
): Promise<"generated" | "already-generated" | "busy"> {
  if (Platform.OS !== "ios") throw new Error(statusError);
  const settings = await getChallengeSettings(petId);
  if (settings.plan !== "plus")
    throw new Error("Switch this family to Pawmily Plus first.");
  const pet = await getPet(petId);
  if (!pet) throw new Error("Pet not found");
  const week = sundayUTC(new Date());
  const state = stateRef(petId);
  // A lease prevents two devices from generating the same week concurrently.
  // Stale leases can be retried after five minutes.
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const claim = await runTransaction(db, async (tx) => {
    const snap = await tx.get(state);
    const d = snap.data() ?? {};
    if (!manual && d.week === week && d.status === "complete")
      return "already-generated";
    if (
      d.status === "generating" &&
      typeof d.leaseUntil === "number" &&
      d.leaseUntil > Date.now()
    )
      return "busy";
    tx.set(
      state,
      { week, status: "generating", nonce, leaseUntil: Date.now() + 300000 },
      { merge: true },
    );
    return "claimed";
  });
  if (claim !== "claimed") return claim;
  try {
    const pref = await fetchChallengePreferences(petId);
    const members = (await getUserPetsForPet(petId)).map(
      (link) => link.userId.id,
    );
    const existing = await getChallengesForPet(petId);
    const enabled = pref.saved?.activityTypes ?? [
      "Feed",
      "Walk",
      "Train",
      "Play",
      "Groom",
    ];
    const preferences = Object.entries(categories).map(
      ([activity, category]) => ({
        category,
        enabled: enabled.includes(activity),
        memberIds: (
          pref.saved?.participantsByActivity?.[activity] ??
          pref.saved?.userIds ??
          members
        ).filter((id) => members.includes(id)),
      }),
    );
    const history = existing
      .filter((c) => c.completionStatus !== "in_progress")
      .sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis())
      .slice(-20);
    const input: GenerationInput = {
      petId,
      petName: pet.name,
      petSpecies: pet.species.toLowerCase() === "cat" ? "cat" : "dog",
      petBreed: pet.breed ?? undefined,
      petAgeYears: pet.age,
      petRestrictions: settings.restrictions,
      weekStart: week,
      preferences,
      weeklyCount: settings.weeklyCount,
      verifiedMedicationPlan: settings.verifiedMedicationPlan,
      recentChallengeTitles: existing.slice(-20).map((c) => c.title),
      recentChallenges: history.map((c) => ({
        title: c.title,
        category: categories[c.activityTypes[0]] ?? "play",
        status: c.completionStatus === "completed" ? "completed" : "canceled",
        goalType: ([
          "unique_participants",
          "duration",
          "unique_activities",
          "daily",
        ].includes(c.goalType)
          ? c.goalType
          : "unique_activities") as GoalType,
        goal: c.goal,
        progress: c.progress,
      })),
    };
    // Native module is only imported on iOS, never in Android's module graph at runtime.
    const { generateApple } = await import("@/lib/appleChallengeEngine");
    const result = await generateApple(input);
    if (result.challenges.length !== settings.weeklyCount)
      throw new Error(
        `Generated ${result.challenges.length} of ${settings.weeklyCount} challenges; nothing was saved.`,
      );
    // Persist as the app's existing Firestore schema, with DocumentReferences and Timestamps.
    const batch = writeBatch(db);
    const start = Timestamp.fromDate(new Date(week + "T00:00:00.000Z"));
    const end = Timestamp.fromDate(weekEnd(week));
    const oldCurrent = existing.filter(
      (c) =>
        c.completionStatus === "in_progress" &&
        c.startDate.toDate() <= weekEnd(week),
    );
    for (const c of oldCurrent)
      batch.update(doc(db, "challenges", c.challengeId), {
        completionStatus: "cancelled",
      });
    for (const c of result.challenges) {
      const challengeRef = doc(collection(db, "challenges"));
      batch.set(challengeRef, {
        petId: petRef(petId),
        participants: c.participants.map(userRef),
        completedBy: [],
        completedAt: null,
        title: c.title,
        description: "",
        completionStatus: "in_progress",
        startDate: start,
        endDate: end,
        progress: 0,
        goal: c.goal,
        goalType: c.goalType,
        activityTypes: c.activityTypes,
        jointActivity: c.jointActivity,
        pointReward: c.pointReward,
        generatedBy: "apple-foundation-models",
        generationWeek: week,
      });
    }
    // Only the lease holder may commit; a second generator cannot overwrite newer results.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(state);
      if (snap.data()?.nonce !== nonce)
        throw new Error(
          "Another family member took over challenge generation.",
        );
      // Firestore transaction cannot atomically commit a separate batch. Mark 'publishing'
      // and keep the lease, then finish after the batch is written.
      tx.update(state, {
        status: "publishing",
        leaseUntil: Date.now() + 300000,
      });
    });
    await batch.commit();
    await setDoc(
      state,
      {
        week,
        status: "complete",
        nonce,
        leaseUntil: 0,
        generatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    dataVersionStore.set(dataVersionStore.get() + 1);
    return "generated";
  } catch (error) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(state);
      if (snap.data()?.nonce === nonce)
        tx.update(state, { status: "failed", leaseUntil: 0 });
    }).catch(() => {});
    throw error;
  }
}
export async function refreshWeeklyChallenges(petId: string) {
  if (Platform.OS !== "ios") return;
  const settings = await getChallengeSettings(petId);
  if (settings.plan === "plus") await regenerateFamilyChallenges(petId, false);
}

/** Deterministic preset challenges for the Free demo plan. */
export async function createFreePresetChallenges(petId: string): Promise<void> {
  const settings = await getChallengeSettings(petId);
  if (settings.plan !== "free") return;
  const pet = await getPet(petId);
  if (!pet) throw new Error("Pet not found");
  const pref = await fetchChallengePreferences(petId);
  const members = (await getUserPetsForPet(petId)).map(
    (link) => link.userId.id,
  );
  const enabled = pref.saved?.activityTypes?.length
    ? pref.saved.activityTypes
    : ["Feed", "Walk", "Train", "Play", "Groom"];
  const templates = [
    {
      activity: "Feed",
      title: `Log ${pet.name}'s meals on 3 days`,
      goalType: "daily",
      goal: 3,
    },
    {
      activity: "Walk",
      title: `Take ${pet.name} for 3 walks`,
      goalType: "unique_activities",
      goal: 3,
    },
    {
      activity: "Play",
      title: `Play with ${pet.name} for 30 minutes`,
      goalType: "duration",
      goal: 30,
    },
    {
      activity: "Train",
      title: `Practice 2 training sessions with ${pet.name}`,
      goalType: "unique_activities",
      goal: 2,
    },
    {
      activity: "Groom",
      title: `Complete 2 grooming sessions for ${pet.name}`,
      goalType: "unique_activities",
      goal: 2,
    },
    {
      activity: "Feed",
      title: `Feed ${pet.name} on 5 different days`,
      goalType: "daily",
      goal: 5,
    },
    {
      activity: "Play",
      title: `Enjoy 3 play sessions with ${pet.name}`,
      goalType: "unique_activities",
      goal: 3,
    },
  ].filter(
    (t) =>
      enabled.includes(t.activity) &&
      (pref.saved?.participantsByActivity?.[t.activity] ?? members).length,
  );
  if (!templates.length)
    throw new Error(
      "Choose at least one eligible challenge activity in Preferences.",
    );
  const chosen = Array.from(
    { length: settings.weeklyCount },
    (_, i) => templates[i % templates.length],
  );
  const old = await getChallengesForPet(petId);
  const batch = writeBatch(db);
  for (const c of old.filter((c) => c.completionStatus === "in_progress")) {
    batch.update(doc(db, "challenges", c.challengeId), {
      completionStatus: "cancelled",
    });
  }
  const week = sundayUTC(new Date());
  const start = Timestamp.fromDate(new Date(week + "T00:00:00.000Z"));
  const end = Timestamp.fromDate(weekEnd(week));
  for (const t of chosen) {
    batch.set(doc(collection(db, "challenges")), {
      petId: petRef(petId),
      participants: (
        pref.saved?.participantsByActivity?.[t.activity] ?? members
      )
        .filter((id) => members.includes(id))
        .map(userRef),
      completedBy: [],
      completedAt: null,
      title: t.title,
      description: "",
      completionStatus: "in_progress",
      startDate: start,
      endDate: end,
      progress: 0,
      goal: t.goal,
      goalType: t.goalType,
      activityTypes: [t.activity],
      jointActivity: false,
      pointReward: 100,
      generatedBy: "free-preset",
      generationWeek: week,
    });
  }
  await batch.commit();
  dataVersionStore.set(dataVersionStore.get() + 1);
}
