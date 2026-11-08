import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActivityChoiceGrid } from "@/components/challenges/ActivityChoiceGrid";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ParticipantsCard } from "@/components/log/ParticipantsCard";
import { SectionHeader } from "@/components/log/SectionHeader";
import { currentUserId } from "@/lib/auth";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import {
  CHALLENGE_ACTIVITIES,
  fetchChallengePreferences,
  saveChallengePreferences,
} from "@/lib/challengePreferencesData";
import { selectedPetStore } from "@/lib/store";
import {
  getChallengeSettings,
  setChallengeSettings,
} from "@/lib/challengePlans";
import type { User } from "@/types/firestore";

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export default function ChallengePreferencesScreen() {
  const { pets, pet } = usePets();
  const petId = pet?.petId;

  const [family, setFamily] = useState<User[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(3);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [participantsByActivity, setParticipantsByActivity] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) return;
    let cancelled = false;
    (async () => {
      try {
        const [page, settings] = await Promise.all([
          fetchChallengePreferences(petId),
          getChallengeSettings(petId),
        ]);
        if (cancelled) return;
        setFamily(page.family);
        setWeeklyCount(settings.weeklyCount);
        setActivityTypes(page.saved?.activityTypes ?? []);
        // Until preferences are saved, everyone in the family takes part.
        setParticipantsByActivity(
          Object.fromEntries(
            (page.saved?.activityTypes ?? CHALLENGE_ACTIVITIES).map(
              (activity) => [
                activity,
                page.saved?.participantsByActivity?.[activity] ??
                  page.saved?.userIds ??
                  page.family.map((u) => u.userId),
              ],
            ),
          ),
        );
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  const canSave =
    !!petId &&
    activityTypes.length > 0 &&
    activityTypes.every((a) => (participantsByActivity[a] ?? []).length > 0) &&
    !saving;

  const save = async () => {
    if (!petId || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const chosen = Object.fromEntries(
        activityTypes.map((a) => [a, participantsByActivity[a] ?? []]),
      );
      await saveChallengePreferences(
        petId,
        [...new Set(Object.values(chosen).flat())],
        activityTypes,
        chosen,
      );
      await setChallengeSettings(petId, { weeklyCount });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => {
          setLoading(true);
          selectedPetStore.set(id);
        }}
        eyebrow="Challenge Preferences"
        compact
      />
      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <SectionHeader
              title={`What should ${pet?.name ?? "your pet"}’s challenges focus on?`}
            />
            <Text style={styles.intro}>Pick at least one.</Text>
            <ActivityChoiceGrid
              options={CHALLENGE_ACTIVITIES}
              selected={activityTypes}
              onToggle={(type) => {
                setActivityTypes((cur) => toggle(cur, type));
                setParticipantsByActivity((cur) => ({
                  ...cur,
                  [type]: cur[type] ?? family.map((u) => u.userId),
                }));
              }}
            />
          </View>

          <View>
            <SectionHeader title="Challenges per week" />
            <Text style={styles.intro}>
              Choose how many challenges your family receives each week (1–7).
            </Text>
            <View style={styles.countRow}>
              <Pressable
                style={[
                  styles.countButton,
                  weeklyCount <= 1 && styles.buttonDisabled,
                ]}
                onPress={() =>
                  setWeeklyCount((count) => Math.max(1, count - 1))
                }
                disabled={weeklyCount <= 1}
                accessibilityRole="button"
                accessibilityLabel="Decrease weekly challenge count"
              >
                <Ionicons name="remove" size={24} color={colors.primary} />
              </Pressable>
              <Text style={styles.countValue}>{weeklyCount}</Text>
              <Pressable
                style={[
                  styles.countButton,
                  weeklyCount >= 7 && styles.buttonDisabled,
                ]}
                onPress={() =>
                  setWeeklyCount((count) => Math.min(7, count + 1))
                }
                disabled={weeklyCount >= 7}
                accessibilityRole="button"
                accessibilityLabel="Increase weekly challenge count"
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {activityTypes.map((activity) => (
            <View key={activity}>
              <SectionHeader
                title={`Who takes part in ${activity.toLowerCase()} challenges?`}
                hint="Select at least one"
              />
              <ParticipantsCard
                family={family}
                currentUserId={currentUserId()}
                selected={participantsByActivity[activity] ?? []}
                onToggle={(id) =>
                  setParticipantsByActivity((cur) => ({
                    ...cur,
                    [activity]: toggle(cur[activity] ?? [], id),
                  }))
                }
              />
            </View>
          ))}

          <View style={styles.footer}>
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, !canSave && styles.buttonDisabled]}
              onPress={save}
              disabled={!canSave}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {saving ? "Saving…" : "Save preferences"}
              </Text>
            </Pressable>
            <Text style={styles.hint}>
              Used for {pet?.name ?? "your pet"}’s next challenges.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { marginTop: 40 },
  content: { padding: 20, paddingTop: 12, gap: 26, paddingBottom: 40 },
  intro: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: -6,
    marginBottom: 12,
  },
  footer: { gap: 12 },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  countButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  countValue: {
    minWidth: 38,
    textAlign: "center",
    fontSize: 26,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 18, fontFamily: fonts.heading, color: "#FFFFFF" },
  hint: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  error: { color: colors.openText, textAlign: "center" },
});
