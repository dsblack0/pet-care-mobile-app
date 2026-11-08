// Answers collected during onboarding. They feed the challenge generator (the LLM for Plus,
// the default set for free). Only activityTypes has a Firestore home today
// (challengePreferences); the rest are held here until the models get fields for them.
import { addPet, type NewPetInput } from "@/lib/petData";
import { setChallengeSettings } from "@/lib/challengePlans";
import { createFreePresetChallenges } from "@/lib/weeklyChallenges";
import { currentUserId, sessionStore } from "@/lib/auth";
import { createStore, dataVersionStore } from "@/lib/store";
import {
  getPetReference,
  getUserReference,
  saveChallengePreference,
} from "../../firebaseServices/challengePreferencesService";
import { createChallengePreference } from "../../models/challengePreferences";

/** Care categories the challenge generator supports, as the app's activity types. */
export const CHALLENGE_ACTIVITIES = [
  "Feed",
  "Walk",
  "Train",
  "Play",
  "Groom",
  "Medication",
] as const;

export type ChallengePlan = "plus" | "free";

export type OnboardingAnswers = {
  petId: string | null;
  petName: string;
  species: string;
  /** Which care categories challenges should focus on. */
  activityTypes: string[];
  /** Challenges per week, 1 to 7. */
  weeklyCount: number;
  /** Things challenges must work around, e.g. "No long walks". */
  restrictions: string[];
};

const EMPTY: OnboardingAnswers = {
  petId: null,
  petName: "",
  species: "",
  activityTypes: [],
  weeklyCount: 3,
  restrictions: [],
};

export const onboardingStore = createStore<OnboardingAnswers>(EMPTY);

export function updateAnswers(patch: Partial<OnboardingAnswers>) {
  onboardingStore.set({ ...onboardingStore.get(), ...patch });
}

/** Step 2: create the pet with the signed-in user as owner. */
export async function createOnboardingPet(input: NewPetInput) {
  const pet = await addPet(currentUserId(), input);
  updateAnswers({ petId: pet.petId, petName: pet.name, species: pet.species });
  return pet;
}

/** Last step: save what has a home in Firestore and open the app. */
export async function finishOnboarding(plan: ChallengePlan) {
  const answers = onboardingStore.get();
  if (answers.petId) {
    await saveChallengePreference(
      createChallengePreference(
        getPetReference(answers.petId),
        [getUserReference(currentUserId())],
        answers.activityTypes,
      ),
    );
  }
  if (answers.petId) {
    await setChallengeSettings(answers.petId, {
      plan,
      weeklyCount: answers.weeklyCount,
      restrictions: answers.restrictions,
    });
    if (plan === "free") await createFreePresetChallenges(answers.petId);
  }
  onboardingStore.set(EMPTY);
  dataVersionStore.set(dataVersionStore.get() + 1);
  sessionStore.set("ready");
}
