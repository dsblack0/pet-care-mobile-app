// The pets Pawmily supports. Logging and preset challenges are tailored to each.

export const PET_SPECIES = ["Dog", "Cat", "Rabbit", "Other"] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];
export type SpeciesKey = "dog" | "cat" | "rabbit" | "other";

/** Lower-case key for a stored species. Anything else, e.g. an older "Bird", is other. */
export function speciesKey(species: string | null | undefined): SpeciesKey {
  const s = (species ?? "").trim().toLowerCase();
  if (s === "dog") return "dog";
  if (s === "cat") return "cat";
  if (s === "rabbit" || s === "bunny") return "rabbit";
  return "other";
}

/** Activity types that make sense for each species. Only dogs go on walks. */
const ACTIVITIES_BY_SPECIES: Record<SpeciesKey, readonly string[]> = {
  dog: ["Walk", "Feed", "Play", "Train", "Groom", "Medication"],
  cat: ["Feed", "Play", "Train", "Groom", "Medication"],
  rabbit: ["Feed", "Play", "Train", "Groom", "Medication"],
  other: ["Feed", "Play", "Groom", "Medication"],
};

export function activitiesFor(species: string | null | undefined) {
  return ACTIVITIES_BY_SPECIES[speciesKey(species)];
}

export type PresetTemplate = {
  activity: string;
  title: string;
  goalType: "daily" | "duration" | "unique_activities";
  goal: number;
};

/** Free-plan preset challenges, written for each species. */
export function presetTemplates(
  species: string | null | undefined,
  name: string,
): PresetTemplate[] {
  switch (speciesKey(species)) {
    case "cat":
      return [
        { activity: "Feed", title: `Log ${name}'s meals on 3 days`, goalType: "daily", goal: 3 },
        { activity: "Play", title: `Play with ${name} using a wand toy for 20 minutes`, goalType: "duration", goal: 20 },
        { activity: "Groom", title: `Brush ${name} twice this week`, goalType: "unique_activities", goal: 2 },
        { activity: "Train", title: `Practice 2 short clicker sessions with ${name}`, goalType: "unique_activities", goal: 2 },
        { activity: "Feed", title: `Feed ${name} on 5 different days`, goalType: "daily", goal: 5 },
        { activity: "Play", title: `Enjoy 3 play sessions with ${name}`, goalType: "unique_activities", goal: 3 },
      ];
    case "rabbit":
      return [
        { activity: "Feed", title: `Log ${name}'s fresh hay and greens on 5 days`, goalType: "daily", goal: 5 },
        { activity: "Play", title: `Give ${name} 30 minutes of supervised floor time`, goalType: "duration", goal: 30 },
        { activity: "Groom", title: `Brush ${name} twice this week`, goalType: "unique_activities", goal: 2 },
        { activity: "Train", title: `Practice 2 litter or target training sessions with ${name}`, goalType: "unique_activities", goal: 2 },
        { activity: "Feed", title: `Log ${name}'s meals on 3 days`, goalType: "daily", goal: 3 },
        { activity: "Play", title: `Enjoy 3 play sessions with ${name}`, goalType: "unique_activities", goal: 3 },
      ];
    case "other":
      return [
        { activity: "Feed", title: `Log ${name}'s meals on 3 days`, goalType: "daily", goal: 3 },
        { activity: "Play", title: `Enjoy 3 play sessions with ${name}`, goalType: "unique_activities", goal: 3 },
        { activity: "Groom", title: `Complete 2 care sessions for ${name}`, goalType: "unique_activities", goal: 2 },
        { activity: "Feed", title: `Feed ${name} on 5 different days`, goalType: "daily", goal: 5 },
        { activity: "Play", title: `Spend 20 minutes with ${name} this week`, goalType: "duration", goal: 20 },
      ];
    default:
      return [
        { activity: "Feed", title: `Log ${name}'s meals on 3 days`, goalType: "daily", goal: 3 },
        { activity: "Walk", title: `Take ${name} for 3 walks`, goalType: "unique_activities", goal: 3 },
        { activity: "Play", title: `Play with ${name} for 30 minutes`, goalType: "duration", goal: 30 },
        { activity: "Train", title: `Practice 2 training sessions with ${name}`, goalType: "unique_activities", goal: 2 },
        { activity: "Groom", title: `Complete 2 grooming sessions for ${name}`, goalType: "unique_activities", goal: 2 },
        { activity: "Feed", title: `Feed ${name} on 5 different days`, goalType: "daily", goal: 5 },
        { activity: "Play", title: `Enjoy 3 play sessions with ${name}`, goalType: "unique_activities", goal: 3 },
      ];
  }
}
