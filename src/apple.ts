
import {AppleLLMSession, isFoundationModelsEnabled} from 'react-native-apple-llm';
import {buildPrompt, SESSION_INSTRUCTIONS, PROMPT_VERSION} from './prompt';
import {validateChallenge, validateContext} from './validation';
import type {ContextType, ChallengeType} from './schema';

// The plugin's flat schema is used once per challenge.
// Metric fields are converted to our internal metric schema.
export const structure = {
  title: { type: 'string' as const },
  description: { type: 'string' as const },
  category: {
    type: 'string' as const,
    enum: [
      'feeding',
      'walking',
      'training',
      'play',
      'grooming',
      'medication',
    ],
  },
  participantIds: {
    type: 'string' as const,
    description: 'Comma-separated eligible family member IDs',
  },
  metricType: {
    type: 'string' as const,
    enum: [
      'count',
      'duration',
      'distinct_days',
      'per_member',
      'group_sessions',
    ],
  },
  target: { type: 'integer' as const },
  requiredMemberIds: {
    type: 'string' as const,
    description: 'Comma-separated IDs, or empty string',
  },
  minimumPerMember: { type: 'integer' as const },
  minimumMembersPerSession: { type: 'integer' as const },
  reasoning: { type: 'string' as const },
};

// Apple structured output may wrap individual values:
// { value: "Example" } or { value: 3 }.
function unwrapValue(value: unknown): unknown {
  let current = value;

  for (let depth = 0; depth < 5; depth++) {
    if (
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      'value' in current
    ) {
      current = (current as { value: unknown }).value;
    } else {
      break;
    }
  }

  return current;
}

function asString(value: unknown): string {
  const unwrapped = unwrapValue(value);

  if (typeof unwrapped !== 'string') {
    throw new Error(
      `Expected string, received ${JSON.stringify(unwrapped)}`
    );
  }

  return unwrapped;
}

function asNumber(value: unknown): number {
  const unwrapped = unwrapValue(value);

  if (
    typeof unwrapped !== 'number' &&
    typeof unwrapped !== 'string'
  ) {
    throw new Error(
      `Expected number, received ${JSON.stringify(unwrapped)}`
    );
  }

  if (
    typeof unwrapped === 'string' &&
    unwrapped.trim() === ''
  ) {
    throw new Error('Expected number, received empty string');
  }

  const number = Number(unwrapped);

  if (!Number.isFinite(number)) {
    throw new Error(
      `Invalid number: ${JSON.stringify(unwrapped)}`
    );
  }

  return number;
}

function asIds(value: unknown): string[] {
  const unwrapped = unwrapValue(value);

  if (typeof unwrapped === 'string') {
    return unwrapped
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
  }

  if (Array.isArray(unwrapped)) {
    return unwrapped
      .map(item => asString(item).trim())
      .filter(Boolean);
  }

  throw new Error(
    `Expected member IDs, received ${JSON.stringify(unwrapped)}`
  );
}

function unpack(raw: unknown): unknown {
  let value = raw;

  if (typeof value === 'string') {
    value = JSON.parse(value);
  }

  value = unwrapValue(value);

  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('Non-object model response');
  }

  const r = value as Record<string, unknown>;

  const metricType = asString(r.metricType);
  let metric: unknown;

  switch (metricType) {
    case 'count':
      metric = {
        type: 'count',
        target: asNumber(r.target),
      };
      break;

    case 'duration':
      metric = {
        type: 'duration',
        targetMinutes: asNumber(r.target),
      };
      break;

    case 'distinct_days':
      metric = {
        type: 'distinct_days',
        targetDays: asNumber(r.target),
      };
      break;

    case 'per_member':
      metric = {
        type: 'per_member',
        requiredMemberIds: asIds(r.requiredMemberIds),
        minimumPerMember: asNumber(r.minimumPerMember),
      };
      break;

    case 'group_sessions':
      metric = {
        type: 'group_sessions',
        targetSessions: asNumber(r.target),
        minimumMembersPerSession: asNumber(
          r.minimumMembersPerSession
        ),
      };
      break;

    default:
      throw new Error(
        `Unknown metric type: ${metricType}`
      );
  }

  return {
    title: asString(r.title),
    description: asString(r.description),
    category: asString(r.category),
    participantIds: asIds(r.participantIds),
    metric,
    reasoning: asString(r.reasoning),
  };
}

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
  challenges: ChallengeType[];
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

function errorDetail(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${
      error.stack ? `\n${error.stack}` : ''
    }`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function generateApple(
  rawContext: ContextType
): Promise<RunRecord> {
  const context = validateContext(rawContext);

  const prompts: string[] = [];
  const rawResponses: unknown[] = [];
  const challenges: ChallengeType[] = [];
  const errors: string[] = [];
  const attempts: GenerationAttempt[] = [];

  const start = Date.now();
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

  const eligibleCategories = context.preferences.filter(
    preference =>
      preference.enabled &&
      preference.memberIds.length > 0 &&
      (
        preference.category !== 'medication' ||
        context.verifiedMedicationPlan
      )
  );

  if (eligibleCategories.length === 0) {
    fail('No eligible categories or participants');
  }

  try {
    availability = String(
      await isFoundationModelsEnabled()
    );

    console.log(
      '[AppleLLM] availability:',
      availability
    );
  } catch (error) {
    errors.push(
      'Availability check: ' + errorDetail(error)
    );

    fail(
      'Apple Foundation Models availability check failed'
    );
  }

  if (availability !== 'available') {
    fail(
      'Apple Foundation Models unavailable: ' +
      availability
    );
  }

  // Each attempt gets its own session so that previous
  // prompts/responses do not accumulate in the context.
  for (
    let i = 0;
    i < context.weeklyCount;
    i++
  ) {
    let accepted = false;

    for (
      let attempt = 0;
      attempt < 3 && !accepted;
      attempt++
    ) {
      const prompt = buildPrompt(
        context,
        i,
        challenges.map(challenge => challenge.title)
      );

      prompts.push(prompt);

      const attemptStart = Date.now();

      console.log(
        `[AppleLLM] challenge ${i + 1}, ` +
        `attempt ${attempt + 1}: starting`
      );

      let raw: unknown;
      let session: AppleLLMSession | undefined;

      try {
        // Fresh session for this specific attempt.
        session = new AppleLLMSession();

        await session.configure({
          instructions: SESSION_INSTRUCTIONS,
        });

        raw = await session.generateStructuredOutput({
          structure,
          prompt,
        });

        rawResponses.push(raw);

        console.log(
          `[AppleLLM] challenge ${i + 1}, ` +
          `attempt ${attempt + 1}: raw response`,
          JSON.stringify(raw, null, 2)
        );

        const unpacked = unpack(raw);

        console.log(
          `[AppleLLM] challenge ${i + 1}, ` +
          `attempt ${attempt + 1}: unpacked`,
          JSON.stringify(unpacked, null, 2)
        );

        const challenge = validateChallenge(
          unpacked,
          context
        );

        const isDuplicate = challenges.some(
          existing =>
            existing.title.trim().toLowerCase() ===
            challenge.title.trim().toLowerCase()
        );

        if (isDuplicate) {
          throw new Error('Duplicate challenge');
        }

        challenges.push(challenge);
        accepted = true;

        attempts.push({
          challengeNumber: i + 1,
          attempt: attempt + 1,
          prompt,
          rawResponse: raw,
          status: 'accepted',
          durationMs: Date.now() - attemptStart,
        });

        console.log(
          `[AppleLLM] challenge ${i + 1}, ` +
          `attempt ${attempt + 1}: accepted`
        );
      } catch (error) {
        const detail = errorDetail(error);

        const message =
          `Challenge ${i + 1}, ` +
          `attempt ${attempt + 1}: ${detail}`;

        errors.push(message);

        attempts.push({
          challengeNumber: i + 1,
          attempt: attempt + 1,
          prompt,
          ...(raw === undefined
            ? {}
            : { rawResponse: raw }),
          error: detail,
          status: 'rejected',
          durationMs: Date.now() - attemptStart,
        });

        console.error(
          '[AppleLLM] ' + message
        );
      } finally {
        if (session) {
          try {
            await session.dispose();
          } catch (error) {
            console.error(
              '[AppleLLM] session disposal failed:',
              error
            );
          }
        }
      }
    }

    if (!accepted) {
      fail(
        'Unable to generate valid challenge ' +
        (i + 1)
      );
    }
  }

  return snapshot();
}
