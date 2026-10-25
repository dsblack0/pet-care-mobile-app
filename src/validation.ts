import {
  Batch,
  Challenge,
  Context,
  type ContextType,
  type ChallengeType,
  type ActivityType,
} from "./schema";
export function parseObject(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  let s = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(s);
}
export function validateContext(raw: unknown) {
  const c = Context.parse(raw);
  const ids = new Set(c.members.map((m) => m.id));
  const categories = new Set(c.preferences.map((p) => p.category));
  if (categories.size !== 6)
    throw Error("Exactly six distinct category preferences required");
  for (const p of c.preferences) {
    if (p.memberIds.some((id) => !ids.has(id)))
      throw Error("Unknown member in preferences");
    if (new Set(p.memberIds).size !== p.memberIds.length)
      throw Error("Duplicate eligible member");
  }
  return c;
}
export function validateChallenge(
  raw: unknown,
  ctx: ContextType,
): ChallengeType {
  const c = Challenge.parse(parseObject(raw));
  const p = ctx.preferences.find((p) => p.category === c.category);
  if (!p?.enabled || p.memberIds.length === 0)
    throw Error("Category disabled or without eligible participants");
  if (
    new Set(c.participantIds).size !== c.participantIds.length ||
    c.participantIds.some((id) => !p.memberIds.includes(id))
  )
    throw Error("Unauthorized or duplicate participant");
  if (c.category === "medication" && !ctx.verifiedMedicationPlan)
    throw Error("No verified medication plan");
  if (
    c.category === "medication" &&
    /\b(dose|dosage|mg|pill|tablet|extra|double|increase|decrease)\b/i.test(
      c.title + " " + c.description,
    )
  )
    throw Error("Potential medication instruction");
  if (c.metric.type === "per_member") {
    if (
      c.metric.requiredMemberIds.some((id) => !c.participantIds.includes(id)) ||
      new Set(c.metric.requiredMemberIds).size !==
        c.metric.requiredMemberIds.length
    )
      throw Error("Invalid per-member requirement");
  }
  if (
    c.metric.type === "group_sessions" &&
    c.metric.minimumMembersPerSession > c.participantIds.length
  )
    throw Error("Impossible group size");
  if (c.metric.type === "distinct_days" && c.metric.targetDays > 7)
    throw Error("More than seven days");
  return c;
}
export function validateBatch(raw: unknown, ctx: ContextType) {
  const parsed = Batch.parse(parseObject(raw));
  if (parsed.challenges.length !== ctx.weeklyCount)
    throw Error("Wrong challenge count");
  const titles = new Set<string>();
  return parsed.challenges.map((ch) => {
    const valid = validateChallenge(ch, ctx);
    const key = valid.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (titles.has(key)) throw Error("Duplicate title");
    titles.add(key);
    return valid;
  });
}
export function progress(ch: ChallengeType, activities: ActivityType[]) {
  const a = activities.filter(
    (x) =>
      x.category === ch.category &&
      x.verified &&
      x.memberIds.some((id) => ch.participantIds.includes(id)),
  );
  switch (ch.metric.type) {
    case "count":
      return { value: a.length, target: ch.metric.target };
    case "duration":
      return {
        value: a.reduce((sum, x) => sum + x.minutes, 0),
        target: ch.metric.targetMinutes,
      };
    case "distinct_days":
      return {
        value: new Set(a.map((x) => x.date.slice(0, 10))).size,
        target: ch.metric.targetDays,
      };
    case "per_member":
      return {
        value: ch.metric.requiredMemberIds.filter(
          (id) =>
            a.filter((x) => x.memberIds.includes(id)).length >=
            ch.metric.minimumPerMember,
        ).length,
        target: ch.metric.requiredMemberIds.length,
      };
    case "group_sessions":
      return {
        value: a.filter(
          (x) =>
            new Set(x.memberIds.filter((id) => ch.participantIds.includes(id)))
              .size >= ch.metric.minimumMembersPerSession,
        ).length,
        target: ch.metric.targetSessions,
      };
  }
}
