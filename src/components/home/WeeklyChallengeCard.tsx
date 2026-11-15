import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ChallengeSourceBadge } from "@/components/challenges/ChallengeSourceBadge";
import { ProgressBar } from "@/components/home/ProgressBar";
import { colors, fonts } from "@/constants/theme";
import { toDate } from "@/lib/homeData";
import { daysLeft, initial } from "@/lib/format";
import type { Challenge, User } from "@/types/firestore";

type Props = { challenge: Challenge; usersById: Record<string, User> };

export function WeeklyChallengeCard({ challenge, usersById }: Props) {
  const { progress, goal, pointReward } = challenge;
  const left = daysLeft(toDate(challenge.endDate));
  const remaining = Math.max(0, goal - progress);
  const activity = (challenge.activityTypes[0] ?? "activity").toLowerCase();

  const progressLabel =
    challenge.goalType === "unique_participants"
      ? `${progress}/${goal} family members`
      : `${progress}/${goal} done`;

  const unlockLabel =
    remaining === 0
      ? `Completed · +${pointReward} Pts`
      : `${remaining === 1 ? "One" : remaining} more family ${activity}${remaining === 1 ? "" : "s"} unlock${remaining === 1 ? "s" : ""} +${pointReward} Pts`;

  return (
    <View style={styles.outer}>
      <Text style={styles.heading}>Weekly family Challenge</Text>
      <Pressable style={styles.inner} onPress={() => router.push({ pathname: "/challenges/[challengeId]", params: { challengeId: challenge.challengeId } })} accessibilityRole="button">
        <ChallengeSourceBadge challenge={challenge} />
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.meta}>
          {progressLabel} · {left} {left === 1 ? "day" : "days"} left
        </Text>
        <ProgressBar value={goal > 0 ? progress / goal : 0} />
        <View style={styles.footer}>
          {challenge.completedBy.map((ref) => (
            <View key={ref.id} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initial(usersById[ref.id]?.name ?? "?")}
              </Text>
            </View>
          ))}
          <Text style={styles.unlock} numberOfLines={2}>
            {unlockLabel}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.challengeOuter,
    borderRadius: 24,
    padding: 16,
    paddingTop: 14,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    paddingHorizontal: 16,
  },
  inner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    lineHeight: 26,
  },
  meta: { fontSize: 14, color: colors.textMuted },
  footer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "600", color: colors.text },
  unlock: { flex: 1, fontSize: 14, color: colors.textMuted, marginLeft: 4 },
});
