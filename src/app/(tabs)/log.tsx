import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
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

import { HomeHeader } from "@/components/home/HomeHeader";
import { ACTIVITIES, ActivityGrid } from "@/components/log/ActivityGrid";
import { DurationPicker } from "@/components/log/DurationPicker";
import { LocationCard } from "@/components/log/LocationCard";
import { MemoryCard } from "@/components/log/MemoryCard";
import { ParticipantsCard } from "@/components/log/ParticipantsCard";
import { SectionHeader } from "@/components/log/SectionHeader";
import { WhenField } from "@/components/log/WhenField";
import { auth, currentUserId } from "@/lib/auth";
import { onAuthStateChanged } from "firebase/auth";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import type { Place } from "@/lib/location";
import { fetchFamily, fetchPointsTable, logActivity } from "@/lib/logData";
import { selectedPetStore } from "@/lib/store";
import type { User } from "@/types/firestore";

/** Activities where "How long?" applies. */


export default function LogScreen() {
  const [family, setFamily] = useState<User[]>([]);
  const [pointsTable, setPointsTable] = useState<Record<string, number>>({});

  const [activity, setActivity] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | "custom" | null>(null);
  const [otherActivity, setOtherActivity] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [participants, setParticipants] = useState<string[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setParticipants(user ? [user.uid] : []);
    });
    return unsubscribe;
  }, []);

  const { pets, pet } = usePets();
  const petId = pet?.petId;

  useEffect(() => {
    (async () => setPointsTable(await fetchPointsTable()))();
  }, []);

  useEffect(() => {
    if (!petId) return;
    (async () => setFamily(await fetchFamily(petId)))();
  }, [petId]);

  const resetForm = () => {
    setActivity(null);
    setDuration(null);
    setOtherActivity("");
    setCustomMinutes("");
    setOccurredAt(new Date());
    setParticipants(auth.currentUser ? [auth.currentUser.uid] : []);
    setPlace(null);
    setPhotoUri(null);
    setCaption("");
    setError(null);
  };

  const selectPet = (id: string) => {
    if (id === petId) return;
    selectedPetStore.set(id);
    setParticipants([currentUserId()]);
  };

  const toggleParticipant = (userId: string) =>
    setParticipants((cur) =>
      cur.includes(userId)
        ? cur.filter((id) => id !== userId)
        : [...cur, userId],
    );

  const minutes = duration === "custom" ? Number(customMinutes) : (duration ?? undefined);
  const basePoints = activity ? (pointsTable[activity] ?? 0) : 0;
  const bonusPoints =
    participants.length > 1 ? (pointsTable.TogetherBonus ?? 0) : 0;
  const canSubmit =
    !!pet &&
    !!activity &&
    participants.length > 0 &&
    (activity !== "Other" || !!otherActivity.trim()) &&
    (duration !== "custom" || (Number.isFinite(minutes) && !!minutes && minutes > 0)) &&
    occurredAt.getTime() <= Date.now() &&
    !submitting;

  const submit = async () => {
    if (!pet || !activity || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await logActivity({
        petId: pet.petId,
        createdBy: currentUserId(),
        activityType: activity,
        occurredAt,
        customActivityName: activity === "Other" ? otherActivity.trim() : undefined,
        participants,
        durationMinutes: minutes,
        description: caption.trim() || undefined,
        localPhotoUri: photoUri ?? undefined,
        location: place ?? undefined,
        basePoints,
        bonusPoints,
      });
      resetForm();
      router.navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // "Walk · 30 min · with Leah · estimated +25 Points"
  const activityLabel = ACTIVITIES.find((a) => a.type === activity)?.label;
  const others = family
    .filter(
      (u) => u.userId !== currentUserId() && participants.includes(u.userId),
    )
    .map((u) => u.name);
  const summary = [
    activity === "Other" ? (otherActivity.trim() || "Other") : (activityLabel ?? "Pick an activity"),
    minutes ? `${minutes} min` : null,
    others.length ? `with ${others.join(" + ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={selectPet}
        eyebrow="Log Activity"
        compact
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <SectionHeader title="Add a memory"  />
            <MemoryCard
              petName={pet?.name ?? "your pet"}
              photoUri={photoUri}
              caption={caption}
              onPhotoChange={setPhotoUri}
              onCaptionChange={setCaption}
            />
          </View>

          <View>
            <SectionHeader
              title={`What did ${pet?.name ?? "your pet"} do?`}
              hint="Required"
            />
            <ActivityGrid selected={activity} onSelect={setActivity} />
            {activity === "Other" && (
              <TextInput style={styles.otherInput} value={otherActivity} onChangeText={setOtherActivity} placeholder="What activity did you do?" placeholderTextColor={colors.textMuted} maxLength={100} accessibilityLabel="Custom activity name" />
            )}
          </View>

          <View>
            <SectionHeader
              title="How long?"
              hint="Optional"
            />
            <DurationPicker
              choice={duration}
              customMinutes={customMinutes}
              onChoose={setDuration}
              onCustomChange={setCustomMinutes}
            />
          </View>

          <View>
            <SectionHeader title="When did it happen?" hint="Choose date & time" />
            <WhenField value={occurredAt} onChange={setOccurredAt} />
          </View>

          <View>
            <SectionHeader
              title="Who participated?"
              hint="Select all that apply"
            />
            <ParticipantsCard
              family={family}
              currentUserId={currentUserId()}
              selected={participants}
              onToggle={toggleParticipant}
            />
          </View>

          <View>
            <SectionHeader title="Where were you?" hint="Optional" />
            <LocationCard place={place} onChange={setPlace} />
          </View>

          <View style={styles.footer}>
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {submitting ? "Saving…" : "Log Activity"}
              </Text>
            </Pressable>
            <Text style={styles.summary}>
              {summary}
              {activity && (
                <Text style={styles.summaryPoints}>
                  {" · "}estimated +{basePoints + bonusPoints} Points
                </Text>
              )}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 12, gap: 26, paddingBottom: 40 },
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
  summary: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  summaryPoints: { fontFamily: fonts.subheading, color: colors.primary },
  error: { color: colors.openText, textAlign: "center" },
  otherInput: { marginTop: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, minHeight: 52, color: colors.text, fontSize: 16 },
});
