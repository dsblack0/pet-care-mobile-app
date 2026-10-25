import { z } from "zod";
export const CATEGORIES = [
  "feeding",
  "walking",
  "training",
  "play",
  "grooming",
  "medication",
] as const;
export const Category = z.enum(CATEGORIES);
export const Member = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});
export const Pet = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  species: z.enum(["dog", "cat"]),
  ageYears: z.number().nonnegative(),
  restrictions: z.array(z.string()),
});
export const Preference = z.object({
  category: Category,
  enabled: z.boolean(),
  memberIds: z.array(z.string()),
});
export const History = z.object({
  id: z.string(),
  category: Category,
  title: z.string(),
  status: z.enum(["completed", "canceled"]),
  metricType: z.string(),
  target: z.number().nonnegative(),
  reason: z.string().optional(),
  week: z.string(),
});
export const Context = z.object({
  pet: Pet,
  members: z.array(Member).min(1),
  preferences: z.array(Preference).length(6),
  history: z.array(History),
  weeklyCount: z.number().int().min(1).max(7),
  weekStart: z.string(),
  verifiedMedicationPlan: z.boolean().default(false),
});
export const Metric = z.discriminatedUnion("type", [
  z.object({ type: z.literal("count"), target: z.number().int().positive() }),
  z.object({
    type: z.literal("duration"),
    targetMinutes: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("distinct_days"),
    targetDays: z.number().int().min(1).max(7),
  }),
  z.object({
    type: z.literal("per_member"),
    requiredMemberIds: z.array(z.string()).min(1),
    minimumPerMember: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("group_sessions"),
    targetSessions: z.number().int().positive(),
    minimumMembersPerSession: z.number().int().min(2),
  }),
]);
export const Challenge = z.object({
  title: z.string().min(3).max(90),
  description: z.string().min(10).max(400),
  category: Category,
  participantIds: z.array(z.string()).min(1),
  metric: Metric,
  reasoning: z.string().max(400),
});
export const Batch = z.object({ challenges: z.array(Challenge) });
export const Activity = z.object({
  id: z.string(),
  category: Category,
  date: z.string(),
  memberIds: z.array(z.string()).min(1),
  minutes: z.number().nonnegative().default(0),
  verified: z.boolean().default(true),
});
export type ContextType = z.infer<typeof Context>;
export type ChallengeType = z.infer<typeof Challenge>;
export type ActivityType = z.infer<typeof Activity>;
