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
  breed: z.string().optional(),
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
export const GOAL_TYPES = ["unique_participants", "duration", "unique_activities", "daily"] as const;
export const GoalType = z.enum(GOAL_TYPES);
export const ACTIVITY_TYPES = {feeding:"Feed",walking:"Walk",training:"Train",play:"Play",grooming:"Groom",medication:"Medication"} as const;
export const Challenge = z.object({
  challengeId:z.string().min(1), petId:z.string().min(1),
  participants:z.array(z.string()).min(1), completedBy:z.array(z.string()),
  completedAt:z.string().nullable(), title:z.string().min(3).max(100),
  completionStatus:z.enum(["not_started","in_progress","completed"]),
  startDate:z.string().datetime(), endDate:z.string().datetime(),
  progress:z.number().nonnegative(), goal:z.number().int().positive(),
  goalType:GoalType, activityTypes:z.array(z.string()).min(1),
  jointActivity:z.boolean(), pointReward:z.number().int().nonnegative(),
}).strict();
export const Batch=z.object({challenges:z.array(Challenge)});
export const Activity=z.object({
 id:z.string(),category:Category,date:z.string(),memberIds:z.array(z.string()).min(1),
 minutes:z.number().nonnegative().default(0),verified:z.boolean().default(true)
});
export type ContextType=z.infer<typeof Context>;
export type ChallengeType=z.infer<typeof Challenge>;
export type ActivityType=z.infer<typeof Activity>;
