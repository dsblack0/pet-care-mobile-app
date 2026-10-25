
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
  weekStart: string; // YYYY-MM-DD
  preferences: ChallengePreference[];
  verifiedMedicationPlan: boolean;

  // Optional short summaries, not full activity logs.
  recentChallengeTitles?: string[];

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

export const PROMPT_VERSION = 'firebase-v1-compact';

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

const SESSION_INSTRUCTIONS =
  'Create concise, measurable weekly pet-care ' +
  'challenges. Follow the requested category and ' +
  'goal type. Return only the structured fields. ' +
  'Do not add descriptions or explanations.';

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
): {goalType:GoalType;jointActivity:boolean} {
 const types:GoalType[]=['daily','duration','unique_activities','unique_participants'];
 const combinations=types.flatMap(goalType=>{
   if(goalType==='unique_participants'&&participants.length<2)return [];
   return (participants.length>=2?[false,true]:[false]).map(jointActivity=>({goalType,jointActivity}));
 });
 const unused=combinations.filter(c=>!accepted.some(a=>a.activityTypes[0]===ACTIVITY_TYPE[category]&&a.goalType===c.goalType&&a.jointActivity===c.jointActivity));
 if(!unused.length)throw Error('No unused goal combinations for category');
 return unused[attempt%unused.length];
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
  jointActivity:boolean,
  accepted: FirebaseChallenge[],
  compactRetry: boolean
): string {
  const previous = previousSummary(accepted);

  const history = (input.recentChallengeTitles ?? [])
    .slice(-3)
    .map(title => title.slice(0, 65))
    .join('; ');

  const goalGuidance: Record<GoalType, string> = {
    unique_participants:
      `Goal = number of distinct participating family members, ` +
      `maximum ${category.participants.length}.`,
    duration:
      'Goal = total activity minutes, usually 10-120.',
    unique_activities:
      'Goal = number of distinct logged activities, usually 2-5.',
    daily:
      'Goal = distinct active days, maximum 7.',
  };

  const lines = [
    `Pet: ${input.petName.slice(0, 35)}`,
    `Activity: ${category.category}`,
    `Goal type: ${goalType}`,
    `jointActivity: ${jointActivity}`,
    `Eligible member count: ${category.participants.length}`,
    goalGuidance[goalType],
    'Title: short, specific, natural, no generic numbering.',
    'Use the requested activity and goal type.',
    'Do not duplicate or weaken a previous challenge.',
    'Use exactly the requested jointActivity value.',
    'For jointActivity=true, title must say together.',
    `Already accepted:\n${previous}`,
  ];

  if (!compactRetry && history) {
    lines.push(`Recent past titles: ${history}`);
  }

  if (compactRetry) {
    lines.push('Keep the title under 50 characters.');
  }

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
