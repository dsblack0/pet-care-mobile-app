import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChallengeIcon } from "@/components/challenges/ChallengeIcon";
import { ChallengeSourceBadge } from "@/components/challenges/ChallengeSourceBadge";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ProgressBar } from "@/components/home/ProgressBar";
import { SectionHeader } from "@/components/log/SectionHeader";
import { currentUserId } from "@/lib/auth";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import {
  cancelChallenge,
  challengeKind,
  fetchChallengeDetail,
  type ChallengeDetail,
  type ContributionRow,
} from "@/lib/challengesData";
import { activityLabel, daysLeft, initial, isSameDay } from "@/lib/format";
import { toDate } from "@/lib/homeData";
import { dataVersionStore, selectedPetStore } from "@/lib/store";

const MEMBER_COLORS = [
  { bg: colors.primarySoft, fg: colors.primary },
  { bg: colors.peach, fg: "#C06A1F" },
  { bg: colors.mint, fg: "#3F8A57" },
  { bg: colors.butter, fg: "#B07A00" },
];

export default function ChallengeProgressScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { pets, pet } = usePets();
  const dataVersion = dataVersionStore.useValue();
  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!challengeId) return;
    (async () => setDetail(await fetchChallengeDetail(challengeId)))();
  }, [challengeId, dataVersion]);

  // A challenge belongs to one pet; switching pets goes back to the list.
  const selectPet = (id: string) => {
    selectedPetStore.set(id);
    router.back();
  };

  const cancel = async () => {
    if (!detail) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await cancelChallenge(detail.challenge.challengeId);
    router.back();
  };

  const c = detail?.challenge;
  const kind = c ? challengeKind(c) : null;
  const left = c ? daysLeft(toDate(c.endDate)) : 0;
  const active = c?.completionStatus === "in_progress";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={selectPet}
        eyebrow="Challenge Progress"
        compact
      />
      {c && kind && detail && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, styles.summary]}>
            <View style={styles.summaryTop}>
              <ChallengeIcon challenge={c} />
              <View style={styles.flex}>
                <View style={styles.kindRow}>
                  <Text style={styles.kind}>
                    {kind.label.toUpperCase()} CHALLENGE
                  </Text>
                  <ChallengeSourceBadge challenge={c} />
                </View>
                <Text style={styles.title}>{c.title}</Text>
              </View>
            </View>
            {!!c.description && (
              <Text style={styles.description}>{c.description}</Text>
            )}
            <Text style={styles.muted}>
              {c.progress} of {c.goal} {kind.unit} complete
            </Text>
            <ProgressBar value={c.goal > 0 ? c.progress / c.goal : 0} />
            <View style={styles.summaryBottom}>
              <Text style={styles.muted}>
                {active
                  ? `${left} ${left === 1 ? "day" : "days"} remaining`
                  : c.completionStatus === "completed"
                    ? "Completed"
                    : "Cancelled"}
              </Text>
              <Text style={styles.reward}>Reward: +{c.pointReward} Points</Text>
            </View>
          </View>

          <View>
            <SectionHeader title="Family contribution" />
            <View style={styles.card}>
              {detail.rows.map((row, i) => (
                <MemberRow
                  key={row.user.userId}
                  row={row}
                  color={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                  stillTime={active && left > 0}
                  last={i === detail.rows.length - 1}
                />
              ))}
            </View>
          </View>

          {active && (
            <Pressable
              style={styles.cancel}
              onPress={cancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>
                {confirming
                  ? "Tap again to cancel this challenge"
                  : "Cancel challenge"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MemberRow({
  row,
  color,
  stillTime,
  last,
}: {
  row: ContributionRow;
  color: { bg: string; fg: string };
  stillTime: boolean;
  last: boolean;
}) {
  let line: string;
  if (row.latest) {
    const d = toDate(row.latest.occurredAt);
    const day = isSameDay(d, new Date())
      ? "today"
      : d.toLocaleDateString("en-US", { weekday: "long" });
    const minutes = row.latest.durationMinutes
      ? ` · ${row.latest.durationMinutes} min`
      : "";
    line = `${activityLabel(row.latest.activityType)} ${day}${minutes}`;
  } else if (row.done) {
    line = "Done this week";
  } else {
    line = stillTime ? "Still has time this week" : "Didn't make it this time";
  }

  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={[styles.avatar, { backgroundColor: color.bg }]}>
        <Text style={[styles.avatarText, { color: color.fg }]}>
          {initial(row.user.name)}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.name}>
          {row.user.userId === currentUserId() ? "You" : row.user.name}
        </Text>
        <Text style={styles.muted}>{line}</Text>
      </View>
      <Ionicons
        name={row.done ? "checkmark" : "close"}
        size={22}
        color={row.done ? colors.doneText : colors.openText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, gap: 24, paddingBottom: 40 },
  flex: { flex: 1, gap: 2 },
  muted: { fontSize: 13, color: colors.textMuted },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  summary: { paddingVertical: 16, gap: 10 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  kind: {
    fontSize: 11,
    fontFamily: fonts.heading,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
  description: { fontSize: 15, lineHeight: 21, color: colors.text },
  summaryBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  reward: { fontSize: 14, fontFamily: fonts.heading, color: colors.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontFamily: fonts.heading },
  name: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  cancel: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F2B8A8",
    backgroundColor: "#FCE4DC",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 16, fontFamily: fonts.heading, color: "#B5442A" },
});
