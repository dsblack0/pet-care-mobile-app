import {AppleLLMSession,isFoundationModelsEnabled} from 'react-native-apple-llm';
import {buildPrompt,SESSION_INSTRUCTIONS,PROMPT_VERSION} from './prompt';
import {validateChallenge,validateContext} from './validation';
import type {ContextType,ChallengeType} from './schema';
// The plugin's flat schema is used once per challenge; the metric is represented by flat fields.
export const structure={title:{type:'string' as const},description:{type:'string' as const},category:{type:'string' as const,enum:['feeding','walking','training','play','grooming','medication']},participantIds:{type:'string' as const,description:'Comma-separated family member IDs'},metricType:{type:'string' as const,enum:['count','duration','distinct_days','per_member','group_sessions']},target:{type:'integer' as const},requiredMemberIds:{type:'string' as const,description:'Comma-separated IDs, or empty string'},minimumPerMember:{type:'integer' as const},minimumMembersPerSession:{type:'integer' as const},reasoning:{type:'string' as const}};
function unpack(raw:unknown):unknown{let x:unknown=raw;if(typeof x==='string')x=JSON.parse(x);if(!x||typeof x!=='object')throw Error('Non-object model response');const r=x as Record<string,unknown>;const ids=(v:unknown)=>typeof v==='string'?v.split(',').map(s=>s.trim()).filter(Boolean):[];const target=Number(r.target);let metric:unknown;switch(r.metricType){case 'count':metric={type:'count',target};break;case 'duration':metric={type:'duration',targetMinutes:target};break;case 'distinct_days':metric={type:'distinct_days',targetDays:target};break;case 'per_member':metric={type:'per_member',requiredMemberIds:ids(r.requiredMemberIds),minimumPerMember:Number(r.minimumPerMember)};break;case 'group_sessions':metric={type:'group_sessions',targetSessions:target,minimumMembersPerSession:Number(r.minimumMembersPerSession)};break;default:throw Error('Unknown metric type');}return {title:r.title,description:r.description,category:r.category,participantIds:ids(r.participantIds),metric,reasoning:r.reasoning};}
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
  constructor(message: string, public readonly diagnostics: RunRecord) {
    super(message);
    this.name = 'GenerationDiagnosticError';
  }
}
function errorDetail(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}${e.stack ? `\n${e.stack}` : ''}`;
  try { return JSON.stringify(e); } catch { return String(e); }
}
export async function generateApple(rawContext: ContextType): Promise<RunRecord> {
  const context = validateContext(rawContext);
  const prompts: string[] = [];
  const rawResponses: unknown[] = [];
  const challenges: ChallengeType[] = [];
  const errors: string[] = [];
  const attempts: GenerationAttempt[] = [];
  const start = Date.now();
  let availability: string | undefined;
  const snapshot = (): RunRecord => ({
    promptVersion: PROMPT_VERSION, prompts, rawResponses, challenges,
    durationMs: Date.now() - start, errors, availability, attempts,
  });
  const fail = (message: string): never => { throw new GenerationDiagnosticError(message, snapshot()); };
  if (!context.preferences.some(p => p.enabled && p.memberIds.length && (p.category !== 'medication' || context.verifiedMedicationPlan))) {
    fail('No eligible categories or participants');
  }
  try {
    availability = String(await isFoundationModelsEnabled());
    console.log('[AppleLLM] availability:', availability);
  } catch (e) {
    errors.push('Availability check: ' + errorDetail(e));
    fail('Apple Foundation Models availability check failed');
  }
  if (availability !== 'available') fail('Apple Foundation Models unavailable: ' + availability);
  let session: AppleLLMSession;
  try { session = new AppleLLMSession(); }
  catch (e) { errors.push('Session construction: ' + errorDetail(e)); fail('Unable to create Apple LLM session'); }
  try {
    try {
      await session.configure({ instructions: SESSION_INSTRUCTIONS });
      console.log('[AppleLLM] session configured');
    } catch (e) {
      errors.push('Session configuration: ' + errorDetail(e));
      fail('Unable to configure Apple LLM session');
    }
    for (let i = 0; i < context.weeklyCount; i++) {
      let accepted = false;
      for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
        const prompt = buildPrompt(context, i, challenges.map(c => c.title)) +
          `\nAttempt ${attempt + 1}. Previous errors: ${errors.slice(-2).join('; ')}`;
        prompts.push(prompt);
        const attemptStart = Date.now();
        console.log(`[AppleLLM] challenge ${i + 1}, attempt ${attempt + 1}: starting`);
        let raw: unknown;
        try {
          raw = await session.generateStructuredOutput({ structure, prompt });
          rawResponses.push(raw);
          console.log(`[AppleLLM] challenge ${i + 1}, attempt ${attempt + 1}: raw response`, raw);
          const ch = validateChallenge(unpack(raw), context);
          if (challenges.some(c => c.title.trim().toLowerCase() === ch.title.trim().toLowerCase())) {
            throw Error('Duplicate challenge');
          }
          challenges.push(ch);
          accepted = true;
          attempts.push({ challengeNumber: i + 1, attempt: attempt + 1, prompt, rawResponse: raw,
            status: 'accepted', durationMs: Date.now() - attemptStart });
          console.log(`[AppleLLM] challenge ${i + 1}, attempt ${attempt + 1}: accepted`);
        } catch (e) {
          const detail = errorDetail(e);
          const message = `Challenge ${i + 1}, attempt ${attempt + 1}: ${detail}`;
          errors.push(message);
          attempts.push({ challengeNumber: i + 1, attempt: attempt + 1, prompt,
            ...(raw === undefined ? {} : { rawResponse: raw }), error: detail,
            status: 'rejected', durationMs: Date.now() - attemptStart });
          console.error('[AppleLLM] ' + message);
        }
      }
      if (!accepted) fail('Unable to generate valid challenge ' + (i + 1));
    }
    return snapshot();
  } finally {
    try { await session.dispose(); }
    catch (e) { console.error('[AppleLLM] session disposal failed:', e); }
  }
}
