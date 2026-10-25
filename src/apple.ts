
import {
  AppleLLMSession,
  isFoundationModelsEnabled,
} from 'react-native-apple-llm';

// --------------------------------------------------
// Types
// --------------------------------------------------

export type Category =
  | 'feeding'
  | 'walking'
  | 'training'
  | 'play'
  | 'grooming'
  | 'medication';

export type GoalType =
  | 'unique_participants'
  | 'duration'
  | 'unique_activities'
  | 'daily';

export type ChallengeStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed';

export type ChallengePreference = {
  category: Category;
  enabled: boolean;
  memberIds: string[];
};

export type GenerationInput = {
  petId: string;
  petName: string;
  petSpecies?: 'dog' | 'cat';
  petBreed?: string;
  petAgeYears?: number;
  petRestrictions?: string[];
  weekStart: string; // YYYY-MM-DD
  preferences: ChallengePreference[];
  verifiedMedicationPlan: boolean;

  // Optional short summaries, not full activity logs.
  recentChallengeTitles?: string[];
  recentChallenges?: Array<{
    title: string;
    category: Category;
    status: 'completed' | 'canceled';
    goalType: GoalType;
    goal: number;
    progress?: number;
    reason?: string;
  }>;

  // Default: 5
  weeklyCount?: number;

  // Default: 100
  pointReward?: number;
};

export type FirebaseChallenge = {
  challengeId: string;
  petId: string;
  participants: string[];
  completedBy: string[];
  completedAt: string | null;
  title: string;
  completionStatus: ChallengeStatus;
  startDate: string;
  endDate: string;
  progress: number;
  goal: number;
  goalType: GoalType;
  activityTypes: string[];
  jointActivity: boolean;
  pointReward: number;
};

export type GenerationAttempt = {
  challengeNumber: number;
  attempt: number;
  prompt: string;
  rawResponse?: unknown;
  error?: string;
  status: 'accepted' | 'rejected';
  durationMs: number;
};

export type RunRecord = {
  promptVersion: string;
  prompts: string[];
  rawResponses: unknown[];
  challenges: FirebaseChallenge[];
  durationMs: number;
  errors: string[];
  availability?: string;
  attempts: GenerationAttempt[];
};

export class GenerationDiagnosticError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: RunRecord
  ) {
    super(message);
    this.name = 'GenerationDiagnosticError';
  }
}

// --------------------------------------------------
// Constants
// --------------------------------------------------

export const PROMPT_VERSION = 'firebase-v4-eligibility-recovery';

const MAX_ATTEMPTS = 4;
const MAX_EXTRA_SLOTS = 3; // At most 8 slots to obtain 5 valid challenges.
const MIN_ACCEPTED = 4;

const CATEGORIES: Category[] = [
  'feeding',
  'walking',
  'training',
  'play',
  'grooming',
  'medication',
];

const GOAL_TYPES: GoalType[] = [
  'unique_participants',
  'duration',
  'unique_activities',
  'daily',
];

// IMPORTANT:
// Change these values if your activity logs use
// different exact activityType strings.
const ACTIVITY_TYPE: Record<Category, string> = {
  feeding: 'Feed',
  walking: 'Walk',
  training: 'Train',
  play: 'Play',
  grooming: 'Groom',
  medication: 'Medication',
};

const SESSION_INSTRUCTIONS = [
  'Create ONE personalized, measurable weekly pet-care challenge. Invent the challenge idea FIRST, write its natural title, THEN derive category, goalType, goal and jointActivity from the same idea.',
  'Fields: category is one enabled activity: feeding (meals), walking (walks), training (skills), play (enrichment), grooming (care), medication (prescribed doses; only when allowed).',
  'goalType=daily counts DISTINCT active days (goal 1-7); duration counts TOTAL logged minutes; unique_activities counts DISTINCT qualifying activity logs, NOT kinds of activities; unique_participants counts DISTINCT eligible family members across logs (goal cannot exceed eligible member count).',
  'jointActivity=true means EVERY counted log includes at least TWO distinct eligible members. If the chosen category has only ONE eligible member, jointActivity MUST be false. For jointActivity=true, the title MUST explicitly say together or with another family member. A title without shared participation MUST use jointActivity=false.',
  'Before output, compare the title against jointActivity, category, goalType and goal. If jointActivity=true and the title does not say together or with another family member, REWRITE THE TITLE to state it. Title and fields must express the SAME completion requirement, even if wording differs. Never imply an extra requirement the fields cannot measure. "Every day" means daily/7, "3 days" means daily/3, "60 minutes" means duration/60 total, "3 sessions" means unique_activities/3, "everyone" means unique_participants/eligible count.',
  'Good titles: "Log Milo\'s feeding every day this week"; "Spend 60 minutes playing with Milo this week"; "Complete 3 training sessions with Milo"; "Everyone takes Milo for a walk"; "Brush Milo on 2 different days"; "Complete 3 play sessions together".',
  'Choose achievable goals for the pet\'s breed, age, restrictions, family preferences and recent performance. Prefer unused categories and goal types across the week; never force unsuitable variety. No generic labels, snake_case, descriptions, or extra fields.',
  'Return only title, category, goalType, goal, jointActivity.',
].join(' ');

// Only FIVE model-generated fields.
export const structure = {
  title: {
    type: 'string' as const,
  },
  category: {
    type: 'string' as const,
    enum: CATEGORIES,
  },
  goalType: {
    type: 'string' as const,
    enum: GOAL_TYPES,
  },
  goal: {
    type: 'integer' as const,
  },
  jointActivity: {
    type: 'boolean' as const,
  },
};

// --------------------------------------------------
// Response parsing
// --------------------------------------------------

// The native library can return { value: ... }
// wrappers around generated properties.
function unwrapValue(input: unknown): unknown {
  let value = input;

  for (let i = 0; i < 5; i++) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'value' in value
    ) {
      value = (value as { value: unknown }).value;
    } else {
      break;
    }
  }

  return value;
}

function asObject(input: unknown): Record<string, unknown> {
  const unwrapped = unwrapValue(input);

  const parsed =
    typeof unwrapped === 'string'
      ? JSON.parse(unwrapped)
      : unwrapped;

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw new Error('Model response is not an object');
  }

  return parsed as Record<string, unknown>;
}

function asString(input: unknown): string {
  const value = unwrapValue(input);
  return typeof value === 'string' ? value.trim() : '';
}

function asInteger(input: unknown): number {
  const value = unwrapValue(input);

  if (
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    return NaN;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : NaN;
}

function asBoolean(input: unknown): boolean | null {
  const value = unwrapValue(input);

  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;

  return null;
}

type ModelChallenge = {
  title: string;
  category: Category;
  goalType: GoalType;
  goal: number;
  jointActivity: boolean;
};

function unpack(raw: unknown): ModelChallenge {
  const result = asObject(raw);

  const title = asString(result.title);
  const category = asString(result.category);
  const goalType = asString(result.goalType);
  const goal = asInteger(result.goal);
  const jointActivity = asBoolean(result.jointActivity);

  if (!title || title.length > 100) {
    throw new Error('Invalid title');
  }

  if (!CATEGORIES.includes(category as Category)) {
    throw new Error('Invalid category');
  }

  if (!GOAL_TYPES.includes(goalType as GoalType)) {
    throw new Error('Invalid goal type');
  }

  if (!Number.isInteger(goal) || goal < 1) {
    throw new Error('Invalid goal');
  }

  if (jointActivity === null) {
    throw new Error('Invalid jointActivity');
  }

  return {
    title,
    category: category as Category,
    goalType: goalType as GoalType,
    goal,
    jointActivity,
  };
}

// --------------------------------------------------
// Context preparation
// --------------------------------------------------

type EligiblePreference = {
  category: Category;
  participants: string[];
};

function eligiblePreferences(
  input: GenerationInput
): EligiblePreference[] {
  return input.preferences
    .filter(
      preference =>
        preference.enabled &&
        CATEGORIES.includes(preference.category) &&
        (
          preference.category !== 'medication' ||
          input.verifiedMedicationPlan
        )
    )
    .map(preference => ({
      category: preference.category,
      participants: Array.from(
        new Set(preference.memberIds.filter(Boolean))
      ),
    }))
    .filter(preference => preference.participants.length > 0);
}

function uniqueEligiblePreferences(
  preferences: EligiblePreference[]
): EligiblePreference[] {
  const byCategory = new Map<Category, string[]>();

  for (const preference of preferences) {
    const existing = byCategory.get(preference.category) ?? [];

    byCategory.set(
      preference.category,
      Array.from(
        new Set([...existing, ...preference.participants])
      )
    );
  }

  return Array.from(byCategory, ([category, participants]) => ({
    category,
    participants,
  }));
}

function dateRange(weekStart: string): {
  startDate: string;
  endDate: string;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new Error('weekStart must be YYYY-MM-DD');
  }

  const start = new Date(`${weekStart}T00:00:00.000Z`);

  if (
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== weekStart
  ) {
    throw new Error('Invalid weekStart date');
  }

  const end = new Date(
    start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1
  );

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

// --------------------------------------------------
// Compact, idea-first prompt
// --------------------------------------------------

function previousSummary(accepted: FirebaseChallenge[]): string {
  if (!accepted.length) return 'none';
  return accepted.map(c =>
    `${c.title} [${c.activityTypes[0]}/${c.goalType}/${c.goal}/${c.jointActivity ? 'joint' : 'solo'}]`
  ).join('\n').slice(0, 650);
}

function buildPrompt(
  input: GenerationInput,
  eligible: EligiblePreference[],
  accepted: FirebaseChallenge[],
  compactRetry: boolean,
  lastFailure?: string
): string {
  const usedCategories = new Set(accepted.map(c => c.activityTypes[0]));
  const usedGoalTypes = new Set(accepted.map(c => c.goalType));
  const allowed = [...eligible].sort((a, b) =>
    Number(usedCategories.has(ACTIVITY_TYPE[a.category])) -
    Number(usedCategories.has(ACTIVITY_TYPE[b.category]))
  );
  const history = (input.recentChallenges ?? [])
    .slice(-8).reverse()
    .filter(h => eligible.some(e => e.category === h.category))
    .slice(0, compactRetry ? 2 : 3)
    .map(h => `${h.status === 'completed' ? '+' : '-'} ${h.title.slice(0, 65)} ` +
      `[${h.goalType} ${h.progress ?? (h.status === 'completed' ? h.goal : '?')}/${h.goal}` +
      `${h.reason ? '; ' + h.reason.slice(0, 25) : ''}]`)
    .join('\n');
  const lines = [
    `Pet: ${input.petName.slice(0, 35)} (${input.petSpecies ?? 'pet'}` +
      `${input.petBreed ? ', ' + input.petBreed.slice(0, 35) : ''}` +
      `${input.petAgeYears === undefined ? '' : ', age ' + input.petAgeYears}).`,
    ...(input.petRestrictions?.length ? [`Care: ${input.petRestrictions.slice(0, 2).join('; ').slice(0, 75)}.`] : []),
    `Eligible categories and joint rules: ${allowed.map(e => `${e.category}=${e.participants.length} member(s), ${e.participants.length >= 2 ? 'solo OR joint' : 'SOLO ONLY (jointActivity=false)'}`).join('; ')}.`,
    `Joint-eligible categories ONLY: ${allowed.filter(e => e.participants.length >= 2).map(e => e.category).join(', ') || 'none'}. All other categories MUST use jointActivity=false.`,
    'If jointActivity=true, title MUST say together or with another family member. If title does not describe shared participation, set jointActivity=false or rewrite the title.',
    `Used categories: ${accepted.map(c => c.activityTypes[0]).join(', ') || 'none'}; used goal types: ${[...usedGoalTypes].join(', ') || 'none'}.`,
    `This week's accepted challenges:\n${previousSummary(accepted)}`,
    ...(history ? [`Recent history (+completed, -not completed):\n${history}`] : []),
    'Invent a different, pet-appropriate challenge first; write its action title; then fill category, goalType, goal and jointActivity so all five fields mean the SAME thing.',
    'Prefer unused eligible categories and underused goal types. Pick a feasible target; do not add title conditions that logs cannot measure.',
    ...(compactRetry ? ['Be concise; avoid complex or compound goals.'] : []),
    ...(lastFailure ? [`Previous attempt was rejected: ${lastFailure}. Correct this specific problem; produce a NEW valid challenge.`] : []),
  ];
  return lines.join('\n');
}

// --------------------------------------------------
// Deterministic validation
// --------------------------------------------------

function validateModelChallenge(
  challenge: ModelChallenge,
  eligible: EligiblePreference[],
  accepted: FirebaseChallenge[]
): EligiblePreference {
  const preference = eligible.find(e => e.category === challenge.category);
  if (!preference) throw new Error('Model chose an ineligible category');
  if (challenge.jointActivity && preference.participants.length < 2) {
    throw new Error('Joint activity requires 2 eligible members');
  }
  if (challenge.goalType === 'unique_participants' &&
      (challenge.goal > preference.participants.length || challenge.goal < 1)) {
    throw new Error('Participant goal outside eligible member count');
  }
  if (challenge.goalType === 'daily' && challenge.goal > 7) {
    throw new Error('Daily goal exceeds 7 days');
  }
  if (challenge.goalType === 'duration' && challenge.goal > 240) {
    throw new Error('Duration goal too large');
  }
  if (challenge.goalType === 'unique_activities' && challenge.goal > 14) {
    throw new Error('Activity goal too large');
  }
  const normalize = (title: string) => title.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (accepted.some(c => normalize(c.title) === normalize(challenge.title))) {
    throw new Error('Duplicate title');
  }
  if (accepted.some(c =>
    c.activityTypes[0] === ACTIVITY_TYPE[challenge.category] &&
    c.goalType === challenge.goalType &&
    c.jointActivity === challenge.jointActivity
  )) {
    throw new Error('Overlapping challenge measurement');
  }
  return preference;
}

// --------------------------------------------------
// Firebase object construction
// --------------------------------------------------

function toFirebaseChallenge(
  input: GenerationInput,
  model: ModelChallenge,
  preference: EligiblePreference,
  index: number,
  dates: {
    startDate: string;
    endDate: string;
  }
): FirebaseChallenge {
  return {
    // Local placeholder ID for testing.
    // Replace with a Firestore-generated ID
    // when persisting the challenge.
    challengeId: `${input.petId}_${input.weekStart}_${index + 1}`,

    petId: input.petId,
    participants: [...preference.participants],
    completedBy: [],
    completedAt: null,
    title: model.title,
    completionStatus: 'in_progress',
    startDate: dates.startDate,
    endDate: dates.endDate,
    progress: 0,
    goal: model.goal,
    goalType: model.goalType,
    activityTypes: [ACTIVITY_TYPE[model.category]],
    jointActivity: model.jointActivity,
    pointReward: input.pointReward ?? 100,
  };
}

// --------------------------------------------------
// Main generation function
// --------------------------------------------------

export async function generateApple(
  input: GenerationInput
): Promise<RunRecord> {
  const start = Date.now();

  const prompts: string[] = [];
  const rawResponses: unknown[] = [];
  const challenges: FirebaseChallenge[] = [];
  const errors: string[] = [];
  const attempts: GenerationAttempt[] = [];

  let availability: string | undefined;

  const snapshot = (): RunRecord => ({
    promptVersion: PROMPT_VERSION,
    prompts,
    rawResponses,
    challenges,
    durationMs: Date.now() - start,
    errors,
    availability,
    attempts,
  });

  const fail = (message: string): never => {
    throw new GenerationDiagnosticError(
      message,
      snapshot()
    );
  };

  const count = input.weeklyCount ?? 5;

  if (!Number.isInteger(count) || count < 1 || count > 7) {
    fail('weeklyCount must be between 1 and 7');
  }

  if (!input.petId || !input.petName) {
    fail('Missing pet ID or name');
  }

  let dates: ReturnType<typeof dateRange>;

  try {
    dates = dateRange(input.weekStart);
  } catch (error) {
    fail(String(error));
  }

  const eligible = uniqueEligiblePreferences(
    eligiblePreferences(input)
  );

  if (!eligible.length) {
    fail('No eligible challenge categories');
  }

  try {
    availability = String(
      await isFoundationModelsEnabled()
    );
  } catch (error) {
    errors.push(`Availability check: ${String(error)}`);
    fail('Apple model availability check failed');
  }

  console.log('[AppleLLM] availability:', availability);

  if (availability !== 'available') {
    fail(`Apple Foundation Models unavailable: ${availability}`);
  }

  // Failed slots do not abort the run. Extra slots provide bounded recovery.
  const slotLimit = count + MAX_EXTRA_SLOTS;
  const failedSlots: number[] = [];
  for (let index = 0; index < slotLimit && challenges.length < count; index++) {
    let accepted = false;
    let lastFailure: string | undefined;

    for (
      let attemptIndex = 0;
      attemptIndex < MAX_ATTEMPTS && !accepted;
      attemptIndex++
    ) {
      const prompt = buildPrompt(
        input,
        eligible,
        challenges,
        attemptIndex > 0,
        lastFailure
      );

      prompts.push(prompt);

      const attemptStart = Date.now();
      let raw: unknown;
      let session: AppleLLMSession | undefined;

      console.log(
        `[AppleLLM] challenge ${index + 1}, ` +
        `attempt ${attemptIndex + 1}: starting`
      );

      try {
        // Fresh session: no accumulated transcript.
        session = new AppleLLMSession();

        await session.configure({
          instructions: SESSION_INSTRUCTIONS,
        });

        raw = await session.generateStructuredOutput({
          structure,
          prompt,
        });

        rawResponses.push(raw);

        const modelChallenge = unpack(raw);

        const preference = validateModelChallenge(
          modelChallenge,
          eligible,
          challenges
        );

        const challenge = toFirebaseChallenge(
          input,
          modelChallenge,
          preference,
          challenges.length,
          dates
        );

        challenges.push(challenge);
        accepted = true;

        attempts.push({
          challengeNumber: index + 1,
          attempt: attemptIndex + 1,
          prompt,
          rawResponse: raw,
          status: 'accepted',
          durationMs: Date.now() - attemptStart,
        });

        console.log(
          `[AppleLLM] challenge ${index + 1}: accepted`,
          challenge
        );
      } catch (error) {
        // Save diagnostics, but NEVER append errors
        // or stack traces to the next model prompt.
        const detail =
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error);

        lastFailure = detail.includes('Joint activity requires')
          ? 'Joint activity was selected for a SOLO ONLY category. Choose jointActivity=false or a joint-eligible category and explicitly say together in the title'
          : detail.includes('Duplicate title')
          ? 'Duplicate title. Invent a different challenge and title'
          : detail.includes('Overlapping challenge')
          ? 'Repeated activity and goal combination. Choose a different idea'
          : detail.slice(0, 100);

        errors.push(
          `Challenge ${index + 1}, ` +
          `attempt ${attemptIndex + 1}: ${detail}`
        );

        attempts.push({
          challengeNumber: index + 1,
          attempt: attemptIndex + 1,
          prompt,
          ...(raw === undefined
            ? {}
            : { rawResponse: raw }),
          error: detail,
          status: 'rejected',
          durationMs: Date.now() - attemptStart,
        });

        console.warn(
          `[AppleLLM] challenge ${index + 1}, ` +
          `attempt ${attemptIndex + 1}: ${detail}`
        );
      } finally {
        if (session) {
          try {
            await session.dispose();
          } catch (error) {
            console.warn(
              '[AppleLLM] session disposal failed',
              error
            );
          }
        }
      }
    }

    if (!accepted) {
      failedSlots.push(index + 1);
      const message = `Slot ${index + 1} exhausted ${MAX_ATTEMPTS} attempts; continuing`;
      errors.push(message);
      console.warn('[AppleLLM]', message);
    }
  }

  if (challenges.length < Math.min(MIN_ACCEPTED, count)) {
    fail(`Generated only ${challenges.length}/${count} valid challenges after ${slotLimit} slots`);
  }
  if (challenges.length < count) {
    errors.push(`Partial result: ${challenges.length}/${count} valid challenges; exhausted slots: ${failedSlots.join(', ') || 'none'}`);
  }
  return snapshot();
}
