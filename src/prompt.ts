import type { ContextType } from "./schema";
export const PROMPT_VERSION = "weekly-v1";
export const SESSION_INSTRUCTIONS = `You propose weekly pet-owner challenges. Only six categories exist: feeding, walking, training, play, grooming, medication. Follow user preferences and authorized members. Use completed and canceled challenge history as signals, not certainties. Never invent a medication, dose, timing, prescription or treatment. If no verified medication plan, never generate medication challenges. Respond only in the requested structured format. Do not include private personal data beyond supplied IDs.`;
export function buildPrompt(
  context: ContextType,
  index: number,
  acceptedTitles: string[],
) {
  return `Generate challenge ${index + 1} of ${context.weeklyCount} for the week beginning ${context.weekStart}. Output exactly one challenge.\nUSER CONTEXT JSON:\n${JSON.stringify(context)}\nALREADY ACCEPTED TITLES: ${JSON.stringify(acceptedTitles)}\nRules: use only enabled categories with nonempty eligible member IDs; participantIds must be a comma-separated subset of eligible IDs; avoid near-duplicates and repeating recently canceled high targets without justification. Supported metric types: count (target), duration (targetMinutes), distinct_days (targetDays), per_member (requiredMemberIds comma-separated, minimumPerMember), group_sessions (targetSessions, minimumMembersPerSession). For per_member include every required ID among participantIds. For group_sessions choose at least minimumMembersPerSession eligible participants. Include short reasoning tied to preferences/history. For medication only suggest tracking an existing verified plan; never instruct administering extra doses. Never invent health advice.`;
}
