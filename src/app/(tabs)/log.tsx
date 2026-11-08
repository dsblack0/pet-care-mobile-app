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
const TIMED = ["Walk", "Play", "Train"];

export default function LogScreen() {
  const [family, setFamily] = useState<User[]>([]);
  const [pointsTable, setPointsTable] = useState<Record<string, number>>({});

  const [activity, setActivity] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [minutesAgo, setMinutesAgo] = useState(0);
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
    setDuration(30);
    setCustomMinutes("");
    setMinutesAgo(0);
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

  const timed = activity !== null && TIMED.includes(activity);
  const minutes = !timed
    ? undefined
    : duration === "custom"
      ? Number(customMinutes)
      : duration;
  const basePoints = activity ? (pointsTable[activity] ?? 0) : 0;
  const bonusPoints =
    participants.length > 1 ? (pointsTable.TogetherBonus ?? 0) : 0;
  const canSubmit =
    !!pet &&
    !!activity &&
    participants.length > 0 &&
    (!timed || !!minutes) &&
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
        occurredAt: new Date(Date.now() - minutesAgo * 60_000),
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
    activityLabel ?? "Pick an activity",
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
            <SectionHeader
              title={`What did ${pet?.name ?? "your pet"} do?`}
              hint="Required"
            />
            <ActivityGrid selected={activity} onSelect={setActivity} />
          </View>

          <View>
            <SectionHeader
              title="How long?"
              hint="For walks, play & training"
            />
            <DurationPicker
              choice={duration}
              customMinutes={customMinutes}
              disabled={!timed}
              onChoose={setDuration}
              onCustomChange={setCustomMinutes}
            />
          </View>

          <View>
            <SectionHeader title="When did it happen?" hint="Default: Now" />
            <WhenField minutesAgo={minutesAgo} onChange={setMinutesAgo} />
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

          <View>
            <SectionHeader title="Turn it into a memory" hint="Optional" />
            <MemoryCard
              petName={pet?.name ?? "your pet"}
              photoUri={photoUri}
              caption={caption}
              onPhotoChange={setPhotoUri}
              onCaptionChange={setCaption}
            />
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
});
