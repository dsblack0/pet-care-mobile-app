import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarStack } from "@/components/challenges/AvatarStack";
import { ChallengeIcon } from "@/components/challenges/ChallengeIcon";
import { ChallengeSourceBadge } from "@/components/challenges/ChallengeSourceBadge";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ProgressBar } from "@/components/home/ProgressBar";
import { SectionHeader } from "@/components/log/SectionHeader";
import { PetAvatar } from "@/components/pet/PetAvatar";
import { colors, fonts } from "@/constants/theme";
import { useIsPetOwner } from "@/hooks/useIsPetOwner";
import { usePets } from "@/hooks/usePets";
import {
  challengeKind,
  fetchChallenges,
  fetchRewards,
  type ChallengesPage,
  type RewardsPage,
} from "@/lib/challengesData";
import { daysLeft } from "@/lib/format";
import { getChallengeSettings, type FamilyPlan } from "@/lib/challengePlans";
import {
  regenerateFamilyChallenges,
  refreshWeeklyChallenges,
} from "@/lib/weeklyChallenges";
import { toDate } from "@/lib/homeData";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import type { Challenge, User } from "@/types/firestore";

type Tab = "active" | "completed" | "all";

export default function ChallengesScreen() {
  const { pets, pet } = usePets();
  const dataVersion = dataVersionStore.useValue();
  const [familyPlan, setFamilyPlan] = useState<FamilyPlan>("free");
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState<ChallengesPage | null>(null);
  const [xp, setXp] = useState<RewardsPage | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const petId = pet?.petId;
  const isOwner = useIsPetOwner(petId);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const [c, r] = await Promise.all([
        fetchChallenges(petId),
        fetchRewards(petId),
      ]);
      setPage(c);
      setXp(r);
    })();
  }, [petId, dataVersion]);

  useEffect(() => {
    if (!petId) return;
    let live = true;
    const check = async () => {
      try {
        const settings = await getChallengeSettings(petId);
        if (live) setFamilyPlan(settings.plan);
        if (settings.plan === "plus" && Platform.OS === "ios")
          await refreshWeeklyChallenges(petId);
      } catch (e) {
        console.warn("Weekly challenges:", e);
      }
    };
    void check();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      live = false;
      listener.remove();
    };
  }, [petId, dataVersion]);
  const regenerate = async () => {
    if (!petId || generating) return;
    if (Platform.OS !== "ios") {
      Alert.alert("Feature not available on Android");
      return;
    }
    setGenerating(true);
    try {
      const result = await regenerateFamilyChallenges(petId);
      Alert.alert(
        "Challenges",
        result === "generated"
          ? "New family challenges are ready!"
          : "Challenges are already being generated.",
      );
    } catch (e) {
      Alert.alert(
        "Could not generate challenges",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setGenerating(false);
    }
  };

  const list =
    tab === "active"
      ? (page?.active ?? [])
      : tab === "completed"
        ? (page?.completed ?? [])
        : [...(page?.active ?? []), ...(page?.completed ?? [])];
  const recent = page?.completed[0];
  const next = xp?.level ? xp.level.nextLevelPoints : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        eyebrow="Challenges"
        compact
      />
      {pet && page && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.tabs}>
            <TabChip
              label={`Active ${page.active.length}`}
              active={tab === "active"}
              onPress={() => setTab("active")}
            />
            <TabChip
              label={`Completed ${page.completed.length}`}
              active={tab === "completed"}
              onPress={() => setTab("completed")}
            />
            <TabChip
              label="All family"
              active={tab === "all"}
              onPress={() => setTab("all")}
            />
          </View>

          <View style={[styles.card, styles.petCard]}>
            <PetAvatar pet={pet} size={88} />
            <View style={styles.flex}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petLevel}>
                Level {pet.level}
                {xp?.level ? ` · ${xp.level.title}` : ""}
              </Text>
              {next > 0 && (
                <>
                  <Text style={styles.muted}>
                    {pet.totalPoints.toLocaleString()} / {next.toLocaleString()}{" "}
                    Points
                  </Text>
                  <ProgressBar value={pet.totalPoints / next} />
                </>
              )}
            </View>
          </View>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/challenges/rewards")}
            accessibilityRole="button"
          >
            <Ionicons name="gift-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>See Rewards</Text>
          </Pressable>

          {familyPlan === "plus" && (
            <Pressable
              style={styles.button}
              disabled={generating}
              onPress={() => void regenerate()}
              accessibilityRole="button"
            >
              <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {generating
                  ? "Generating challenges…"
                  : "Regenerate AI challenges"}
              </Text>
            </Pressable>
          )}

          {isOwner && (
            <Pressable
              style={styles.outlineButton}
              onPress={() => router.push("/challenges/edit")}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={styles.outlineButtonText}>Add a challenge</Text>
            </Pressable>
          )}

          <View>
            <SectionHeader
              title={
                tab === "active"
                  ? "Active challenges"
                  : tab === "completed"
                    ? "Completed challenges"
                    : "All challenges"
              }
              hint={`${list.length} goal${list.length === 1 ? "" : "s"}`}
            />
            <View style={styles.list}>
              {list.length === 0 && (
                <Text style={styles.muted}>Nothing here yet.</Text>
              )}
              {list.map((c) => (
                <ChallengeCard
                  key={c.challengeId}
                  challenge={c}
                  usersById={page.usersById}
                />
              ))}
            </View>
          </View>

          {tab === "active" && recent && (
            <View>
              <View style={styles.sectionRow}>
                <SectionHeader title="Recently completed" />
                <Pressable
                  onPress={() => setTab("completed")}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>
                    View all {page.completed.length}
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.card, styles.recent]}>
                <View style={styles.recentTop}>
                  <View style={styles.check}>
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.doneText}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.recentTitle}>{recent.title}</Text>
                    <Text style={styles.muted}>
                      Completed{" "}
                      {recent.completedAt
                        ? toDate(recent.completedAt).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                            },
                          )
                        : ""}{" "}
                      · +{recent.pointReward} Points
                    </Text>
                  </View>
                </View>
                {!!recent.description && (
                  <Text style={styles.muted}>{recent.description}</Text>
                )}
              </View>
            </View>
          )}

          <Pressable
            style={[styles.card, styles.settingsRow]}
            onPress={() => router.push("/challenges/preferences")}
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={styles.settingsText}>Set Challenge Preferences</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TabChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChallengeCard({
  challenge,
  usersById,
}: {
  challenge: Challenge;
  usersById: Record<string, User>;
}) {
  const kind = challengeKind(challenge);
  const left = daysLeft(toDate(challenge.endDate));
  const done = challenge.completionStatus === "completed";
  const names = challenge.completedBy.map((r) => usersById[r.id]?.name ?? "?");

  return (
    <Pressable
      style={[styles.card, styles.challenge]}
      onPress={() => router.push(`/challenges/${challenge.challengeId}`)}
      accessibilityRole="button"
    >
      <View style={styles.challengeTop}>
        <ChallengeIcon challenge={challenge} />
        <View style={styles.flex}>
          <View style={styles.kindRow}>
            <Text style={styles.kind}>{kind.label.toUpperCase()}</Text>
            <ChallengeSourceBadge challenge={challenge} />
          </View>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
        </View>
      </View>
      <Text style={styles.muted}>
        {challenge.progress} of {challenge.goal} {kind.unit}
      </Text>
      <ProgressBar
        value={challenge.goal > 0 ? challenge.progress / challenge.goal : 0}
      />
      <View style={styles.challengeBottom}>
        <AvatarStack names={names} />
        <Text style={styles.muted}>
          {done ? "Completed" : `${left} ${left === 1 ? "day" : "days"}`}
        </Text>
        <Text style={styles.points}>+{challenge.pointReward} Points</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, gap: 20, paddingBottom: 40 },
  flex: { flex: 1, gap: 4 },
  muted: { fontSize: 13, color: colors.textMuted },
  tabs: { flexDirection: "row", gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontFamily: fonts.subheading, color: colors.text },
  chipTextActive: { color: "#FFFFFF" },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  petCard: { flexDirection: "row", alignItems: "center", gap: 16 },
  petName: { fontSize: 26, fontFamily: fonts.heading, color: colors.text },
  petLevel: { fontSize: 15, color: colors.textMuted },
  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { fontSize: 16, fontFamily: fonts.heading, color: "#FFFFFF" },
  outlineButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  outlineButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  list: { gap: 12 },
  challenge: { gap: 10 },
  challengeTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  kindRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kind: {
    fontSize: 11,
    fontFamily: fonts.heading,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  challengeTitle: {
    fontSize: 17,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  challengeBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  points: { fontSize: 14, fontFamily: fonts.heading, color: colors.primary },
  sectionRow: { flexDirection: "row", justifyContent: "space-between" },
  link: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.primary,
    marginTop: 4,
  },
  recent: { gap: 10 },
  recentTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  check: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.doneBg,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTitle: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingsText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.text,
  },
});
