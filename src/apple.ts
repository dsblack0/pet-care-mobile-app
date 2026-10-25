
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

export const PROMPT_VERSION = 'firebase-v2-personalized';

const MAX_ATTEMPTS = 4;

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
  'Write ONE achievable, specific weekly pet-care challenge.',
  'Title must be a natural action sentence with a measurable goal.',
  'Use the pet name when useful. No labels, snake_case or descriptions.',
  'Good style: "Log Milo\'s feeding every day this week";',
  '"Spend 120 minutes playing together";',
  '"Complete 3 activities with another family member";',
  '"Everyone walks Milo once".',
  'Follow the requested category, goalType and jointActivity exactly.',
  'Use history to avoid repeats and adjust difficulty.',
  'Return only the five structured fields.',
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
// Local challenge planning
// --------------------------------------------------

// Choose the category BEFORE prompting.
// This is more reliable than asking the model
// to decide which category has not been used.

function chooseCategory(
  eligible: EligiblePreference[],
  accepted: FirebaseChallenge[],
  attempt: number
): EligiblePreference {
  const usedCounts = new Map<Category, number>();

  for (const challenge of accepted) {
    const category = CATEGORIES.find(
      item =>
        ACTIVITY_TYPE[item] === challenge.activityTypes[0]
    );

    if (category) {
      usedCounts.set(
        category,
        (usedCounts.get(category) ?? 0) + 1
      );
    }
  }

  const sorted = [...eligible].sort((a, b) => {
    const countDifference =
      (usedCounts.get(a.category) ?? 0) -
      (usedCounts.get(b.category) ?? 0);

    if (countDifference !== 0) return countDifference;

    return (
      CATEGORIES.indexOf(a.category) -
      CATEGORIES.indexOf(b.category)
    );
  });

  // Rotate retry choices when possible.
  return sorted[attempt % sorted.length];
}

function chooseGoalType(
  category: Category,
  participants: string[],
  accepted: FirebaseChallenge[],
  attempt: number
): { goalType: GoalType; jointActivity: boolean } {
  // Prefer meaningful activity/metric combinations, not daily for everything.
  const suitability: Record<Category, GoalType[]> = {
    feeding: ['daily', 'unique_activities'],
    walking: ['duration', 'daily', 'unique_activities', 'unique_participants'],
    training: ['unique_activities', 'daily', 'duration'],
    play: ['duration', 'unique_activities', 'unique_participants', 'daily'],
    grooming: ['unique_activities', 'daily'],
    medication: ['daily', 'unique_activities'],
  };
  const options = suitability[category].flatMap(goalType => {
    if (goalType === 'unique_participants' && participants.length < 2) return [];
    const jointOptions = participants.length >= 2 && category !== 'medication'
      ? [false, true] : [false];
    return jointOptions.map(jointActivity => ({ goalType, jointActivity }));
  }).filter(option => !accepted.some(existing =>
    existing.activityTypes[0] === ACTIVITY_TYPE[category] &&
    existing.goalType === option.goalType &&
    existing.jointActivity === option.jointActivity
  ));
  if (!options.length) throw Error('No unused goal combinations for category');
  const globalUses = (type: GoalType) =>
    accepted.filter(challenge => challenge.goalType === type).length;
  options.sort((a, b) =>
    globalUses(a.goalType) - globalUses(b.goalType) ||
    suitability[category].indexOf(a.goalType) - suitability[category].indexOf(b.goalType) ||
    Number(a.jointActivity) - Number(b.jointActivity)
  );
  return options[attempt % options.length];
}

// --------------------------------------------------
// Compact prompts
// --------------------------------------------------

function previousSummary(
  accepted: FirebaseChallenge[]
): string {
  if (accepted.length === 0) return 'none';

  return accepted
    .map(
      challenge =>
        `${challenge.activityTypes[0]}/` +
        `${challenge.goalType}/` +
        `${challenge.goal}/` +
        `${challenge.jointActivity ? 'joint' : 'solo'}: ` +
        challenge.title
    )
    .join('\n')
    .slice(0, 900);
}

function buildPrompt(
  input: GenerationInput,
  category: EligiblePreference,
  goalType: GoalType,
  jointActivity: boolean,
  accepted: FirebaseChallenge[],
  compactRetry: boolean
): string {
  const relevant = (input.recentChallenges ?? [])
    .filter(h => h.category === category.category)
    .slice(-2);
  const others = (input.recentChallenges ?? [])
    .filter(h => h.category !== category.category)
    .slice(-2);
  const history = [...relevant, ...others].slice(0, 4)
    .map(h => `${h.status === 'completed' ? '+' : '-'} ${h.title.slice(0, 75)} ` +
      `(${h.goalType} ${h.progress ?? (h.status === 'completed' ? h.goal : '?')}/${h.goal}` +
      `${h.reason ? '; ' + h.reason.slice(0, 35) : ''})`)
    .join('\n');
  const legacyHistory = (input.recentChallengeTitles ?? [])
    .slice(-3).map(title => title.slice(0, 65)).join('; ');
  const goalGuidance: Record<GoalType, string> = {
    unique_participants: `Distinct eligible members; goal 2-${category.participants.length}.`,
    duration: 'Total minutes this week; select a manageable goal, usually 15-120.',
    unique_activities: 'Number of distinct logged activities; usually 2-5.',
    daily: 'Number of distinct days with an activity; usually 2-7.',
  };
  const usedTypes = [...new Set(accepted.map(c => c.goalType))].join(', ') || 'none';
  const usedActivities = [...new Set(accepted.map(c => c.activityTypes[0]))].join(', ') || 'none';
  const lines = [
    `Pet: ${input.petName.slice(0, 35)}; ${input.petSpecies ?? 'pet'}` +
      `${input.petBreed ? '; breed ' + input.petBreed.slice(0, 40) : ''}` +
      `${input.petAgeYears !== undefined ? '; age ' + input.petAgeYears : ''}.`,
    ...(input.petRestrictions?.length ? [`Care considerations: ${input.petRestrictions.slice(0, 2).join('; ').slice(0, 100)}.`] : []),
    `Family enabled activities: ${input.preferences.filter(p => p.enabled && p.memberIds.length).map(p => p.category).join(', ')}.`,
    `Create activity=${category.category}, goalType=${goalType}, jointActivity=${jointActivity}.`,
    `Eligible family members: ${category.participants.length}.`,
    goalGuidance[goalType],
    'Write a clear, specific action title with the exact goal number and appropriate pet name.',
    'Example style: "Log Milo\'s feeding every day this week"; "Spend 120 minutes playing together";',
    '"Complete 3 activities with another family member"; "Everyone walks Milo once".',
    'These are style examples, not goals to copy. Match your assigned activity and metric.',
    'Diversify activities and goal types across the week; avoid overlapping tasks.',
    `Used activities: ${usedActivities}; used goal types: ${usedTypes}.`,
    `Already accepted:\n${previousSummary(accepted)}`,
  ];
  if (history) lines.push(`Relevant history (+completed, -not completed):\n${history}`);
  else if (legacyHistory && !compactRetry) lines.push(`Past titles: ${legacyHistory}`);
  if (compactRetry) lines.push('Keep the output concise; title under 65 characters.');
  return lines.join('\n');
}

// --------------------------------------------------
// Deterministic validation
// --------------------------------------------------

function validateModelChallenge(
  challenge: ModelChallenge,
  requestedCategory: EligiblePreference,
  requestedGoalType: GoalType,
  requestedJointActivity:boolean,
  accepted: FirebaseChallenge[]
): void {
  if (challenge.category !== requestedCategory.category) {
    throw new Error('Model changed requested category');
  }

  if (challenge.goalType !== requestedGoalType) {
    throw new Error('Model changed requested goal type');
  }

  if(challenge.jointActivity!==requestedJointActivity)throw new Error('Model changed requested jointActivity');

  if (
    challenge.jointActivity &&
    requestedCategory.participants.length < 2
  ) {
    throw new Error('Joint activity requires 2 eligible members');
  }

  if (
    challenge.goalType === 'unique_participants' &&
    challenge.goal > requestedCategory.participants.length
  ) {
    throw new Error('Goal exceeds eligible participant count');
  }

  if (challenge.goalType === 'daily' && challenge.goal > 7) {
    throw new Error('Daily goal exceeds 7 days');
  }

  if (
    challenge.goalType === 'duration' &&
    challenge.goal > 240
  ) {
    throw new Error('Duration goal too large');
  }

  if (
    challenge.goalType === 'unique_activities' &&
    challenge.goal > 14
  ) {
    throw new Error('Activity goal too large');
  }

  if (
    challenge.goalType === 'unique_participants' &&
    challenge.goalType === requestedGoalType &&
    challenge.goal < 2
  ) {
    throw new Error('Unique participants goal must be at least 2');
  }

  const normalizedTitle = challenge.title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    accepted.some(
      existing =>
        existing.title
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, '')
          .replace(/\s+/g, ' ')
          .trim() === normalizedTitle
    )
  ) {
    throw new Error('Duplicate title');
  }

  // Prevent same activity + same measurement +
  // same joint requirement. This deliberately
  // favors diversity over repeated variants.
  if (
    accepted.some(
      existing =>
        existing.activityTypes[0] ===
          ACTIVITY_TYPE[challenge.category] &&
        existing.goalType === challenge.goalType &&
        existing.jointActivity === challenge.jointActivity
    )
  ) {
    throw new Error('Overlapping challenge measurement');
  }
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

  for (let index = 0; index < count; index++) {
    let accepted = false;

    for (
      let attemptIndex = 0;
      attemptIndex < MAX_ATTEMPTS && !accepted;
      attemptIndex++
    ) {
      const preference = chooseCategory(
        eligible,
        challenges,
        attemptIndex
      );

      const plan = chooseGoalType(
        preference.category,
        preference.participants,
        challenges,
        attemptIndex
      );

      const prompt = buildPrompt(
        input,
        preference,
        plan.goalType,
        plan.jointActivity,
        challenges,
        attemptIndex > 0
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

        validateModelChallenge(
          modelChallenge,
          preference,
          plan.goalType,
          plan.jointActivity,
          challenges
        );

        const challenge = toFirebaseChallenge(
          input,
          modelChallenge,
          preference,
          index,
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
      fail(
        `Unable to generate valid challenge ${index + 1}`
      );
    }
  }

  return snapshot();
}
