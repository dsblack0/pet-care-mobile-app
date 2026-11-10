// Owner-only form: add a challenge by hand, or edit an active one (?challengeId=...).
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActivityChoiceGrid } from "@/components/challenges/ActivityChoiceGrid";
import { fieldStyles } from "@/components/form/fieldStyles";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ParticipantsCard } from "@/components/log/ParticipantsCard";
import { SectionHeader } from "@/components/log/SectionHeader";
import { TextField } from "@/components/onboarding/TextField";
import { colors, fonts } from "@/constants/theme";
import { useIsPetOwner } from "@/hooks/useIsPetOwner";
import { usePets } from "@/hooks/usePets";
import { currentUserId } from "@/lib/auth";
import { CHALLENGE_ACTIVITIES } from "@/lib/challengePreferencesData";
import {
  createManualChallenge,
  MANUAL_GOAL_TYPES,
  MANUAL_POINT_REWARD,
  updateChallenge,
} from "@/lib/challengesData";
import { getChallenge, getFamily } from "@/lib/db";
import type { Challenge, User } from "@/types/firestore";

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export default function EditChallengeScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  const editing = !!challengeId;
  const { pets, pet } = usePets();
  const petId = pet?.petId;
  const isOwner = useIsPetOwner(petId);

  const [existing, setExisting] = useState<Challenge | null>(null);
  const [family, setFamily] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [activityType, setActivityType] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) return;
    let live = true;
    (async () => {
      try {
        const [members, challenge] = await Promise.all([
          getFamily(petId),
          challengeId ? getChallenge(challengeId) : Promise.resolve(null),
        ]);
        if (!live) return;
        setFamily(members);
        if (challenge) {
          setExisting(challenge);
          setActivityType(challenge.activityTypes[0] ?? null);
          setGoalType(challenge.goalType);
          setTitle(challenge.title);
          setDescription(challenge.description ?? "");
          setGoal(String(challenge.goal));
          setParticipantIds(challenge.participants.map((r) => r.id));
        } else {
          // New challenges start with the whole family.
          setParticipantIds(members.map((u) => u.userId));
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [petId, challengeId]);

  const unit =
    MANUAL_GOAL_TYPES.find((t) => t.value === goalType)?.unit ?? "done";
  const canSave =
    isOwner &&
    !saving &&
    !!title.trim() &&
    !!goal &&
    participantIds.length > 0 &&
    (editing || (!!activityType && !!goalType));

  const save = async () => {
    if (!petId || !canSave) return;
    setSaving(true);
    setError(null);
    const edits = {
      title,
      description,
      goal: Number(goal),
      participantIds,
    };
    try {
      if (editing) {
        await updateChallenge(challengeId, edits);
      } else {
        await createManualChallenge(petId, {
          ...edits,
          activityType: activityType!,
          goalType: goalType!,
        });
      }
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
        // A challenge belongs to one pet; switching pets leaves the form.
        onSelectPet={() => router.back()}
        eyebrow={editing ? "Edit Challenge" : "New Challenge"}
        compact
      />
      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : !isOwner ? (
        <View style={styles.content}>
          <Text style={styles.hint}>
            Only the person who created {pet?.name ?? "this pet"}’s family can
            add or edit challenges.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {editing && existing ? (
              <View style={[styles.card, styles.fixed]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                />
                <Text style={styles.fixedText}>
                  {existing.activityTypes[0] ?? "Activity"} ·{" "}
                  {existing.progress} of {existing.goal} so far · +
                  {existing.pointReward} Points. The activity, how it’s counted
                  and the points stay the same once a challenge starts.
                </Text>
              </View>
            ) : (
              <>
                <View>
                  <SectionHeader title="What’s it for?" hint="Pick one" />
                  <ActivityChoiceGrid
                    options={CHALLENGE_ACTIVITIES}
                    selected={activityType ? [activityType] : []}
                    onToggle={setActivityType}
                  />
                </View>

                <View>
                  <SectionHeader title="How is it counted?" hint="Pick one" />
                  <View style={styles.chips}>
                    {MANUAL_GOAL_TYPES.map((t) => {
                      const on = goalType === t.value;
                      return (
                        <Pressable
                          key={t.value}
                          style={[styles.chip, on && styles.chipOn]}
                          onPress={() => setGoalType(t.value)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                        >
                          <Text
                            style={[styles.chipText, on && styles.chipTextOn]}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View>
              <SectionHeader title="Details" />
              <View style={[styles.card, styles.form]}>
                <TextField
                  label="Title"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={`e.g. Take ${pet?.name ?? "your pet"} to the park twice`}
                  maxLength={100}
                />
                <View>
                  <Text style={fieldStyles.label}>Description (optional)</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Anything the family should know"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={300}
                    style={[fieldStyles.box, styles.multiline]}
                  />
                </View>
                <View>
                  <Text style={fieldStyles.label}>Goal</Text>
                  <View style={fieldStyles.box}>
                    <TextInput
                      value={goal}
                      onChangeText={(t) => setGoal(t.replace(/[^0-9]/g, ""))}
                      placeholder="3"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={3}
                      style={fieldStyles.text}
                    />
                    <Text style={styles.unit}>{unit}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View>
              <SectionHeader
                title="Who takes part?"
                hint="Select all that apply"
              />
              <ParticipantsCard
                family={family}
                currentUserId={currentUserId()}
                selected={participantIds}
                onToggle={(id) => setParticipantIds((cur) => toggle(cur, id))}
                hint={
                  participantIds.length
                    ? `${participantIds.length} of ${family.length} taking part`
                    : "Pick at least one person"
                }
              />
            </View>

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
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Add challenge"}
                </Text>
              </Pressable>
              {!editing && (
                <Text style={styles.hint}>
                  Runs until the end of this week · +{MANUAL_POINT_REWARD}{" "}
                  Points
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  loading: { marginTop: 40 },
  content: { padding: 20, paddingTop: 12, gap: 26, paddingBottom: 40 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  form: { gap: 16 },
  fixed: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  fixedText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 15, color: colors.text },
  chipTextOn: { fontFamily: fonts.subheading, color: colors.primary },
  multiline: {
    height: 90,
    alignItems: "flex-start",
    paddingTop: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
  unit: { fontSize: 14, color: colors.textMuted },
  footer: { gap: 12 },
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
