import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ActivityGrid } from "@/components/log/ActivityGrid";
import { DurationPicker } from "@/components/log/DurationPicker";
import { LocationCard } from "@/components/log/LocationCard";
import { MemoryCard } from "@/components/log/MemoryCard";
import { ParticipantsCard } from "@/components/log/ParticipantsCard";
import { SectionHeader } from "@/components/log/SectionHeader";
import { WhenField } from "@/components/log/WhenField";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { currentUserId } from "@/lib/auth";
import { getFamily, getMemoriesForPet } from "@/lib/db";
import { editMemory } from "@/lib/editMemory";
import { toDate } from "@/lib/homeData";
import type { Place } from "@/lib/location";
import { selectedPetStore } from "@/lib/store";
import type { Memory, User } from "@/types/firestore";

export default function EditMemoryScreen() {
  const { memoryId } = useLocalSearchParams<{ memoryId: string }>();
  const { pet, pets } = usePets();
  const [original, setOriginal] = useState<Memory | null>(null);
  const [family, setFamily] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState("Other");
  const [customName, setCustomName] = useState("");
  const [date, setDate] = useState(new Date());
  const [duration, setDuration] = useState<number | "custom" | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [caption, setCaption] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    if (!pet?.petId || !memoryId) return;
    let alive = true;
    setLoading(true);
    Promise.all([getMemoriesForPet(pet.petId), getFamily(pet.petId)]).then(([memories, users]) => {
      if (!alive) return;
      const memory = memories.find((item) => item.memoryId === memoryId) ?? null;
      setOriginal(memory);
      setFamily(users);
      if (memory) {
        setActivity(memory.activityType);
        setCustomName(memory.customActivityName ?? "");
        setDate(toDate(memory.occurredAt));
        setCaption(memory.description ?? "");
        setDuration(memory.durationMinutes ?? null);
        setParticipants(Array.from(new Set([currentUserId(), ...memory.participants.map((person) => person.id)])));
        setPlace(memory.location ? {
          latitude: memory.location.latitude,
          longitude: memory.location.longitude,
          label: memory.locationLabel ?? "Saved location",
        } : null);
      }
    }).catch((error) => Alert.alert("Unable to load memory", String(error)))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pet?.petId, memoryId]);

  const own = !!original && original.createdBy.id === currentUserId();
  const minutes = duration === "custom" ? Number(customMinutes) : duration;
  const canSave = own && !saving && !!activity && (activity !== "Other" || !!customName.trim()) &&
    (duration !== "custom" || (Number.isFinite(minutes) && !!minutes && minutes > 0)) &&
    date.getTime() <= Date.now();

  const selectPet = (petId: string) => {
    if (petId === pet?.petId) return;
    selectedPetStore.set(petId);
    // This memory belongs to the original pet; don't edit it under another pet.
    router.replace("/memories");
  };
  const toggleParticipant = (userId: string) => {
    if (userId === currentUserId()) return;
    setParticipants((previous) => previous.includes(userId)
      ? previous.filter((id) => id !== userId)
      : [...previous, userId]);
  };

  const save = async () => {
    if (!pet || !original || !own || saving) return;
    if (activity === "Other" && !customName.trim()) return Alert.alert("Activity name required", "Please name your Other activity.");
    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) return Alert.alert("Invalid duration", "Enter a positive number of minutes, or select None.");
    if (date.getTime() > Date.now()) return Alert.alert("Invalid date", "The activity cannot be in the future.");
    setSaving(true);
    try {
      await editMemory({
        petId: pet.petId, memoryId: original.memoryId, activityType: activity,
        customActivityName: customName, description: caption, occurredAt: date,
        durationMinutes: minutes,
        participants: Array.from(new Set([currentUserId(), ...participants])),
        location: place, photoUri, removePhoto,
      });
      router.replace({ pathname: "/memories/[memoryId]", params: { memoryId: original.memoryId } });
    } catch (error) {
      Alert.alert("Could not save changes", error instanceof Error ? error.message : String(error));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader pet={pet} pets={pets} onSelectPet={selectPet} eyebrow="Edit Memory" compact showBack />
      {loading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : !own ? (
        <Text style={styles.message}>Only the person who posted this memory can edit it.</Text>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View>
              <MemoryCard petName={pet?.name ?? "your pet"} photoUri={photoUri} caption={caption}
                onPhotoChange={(uri) => { setPhotoUri(uri); if (uri) setRemovePhoto(false); }}
                onCaptionChange={setCaption} />
              {!!original?.photoPath && !photoUri && !removePhoto && (
                <Pressable style={styles.photoAction} onPress={() => setRemovePhoto(true)}>
                  <Text style={styles.photoActionText}>Remove existing photo</Text>
                </Pressable>
              )}
              {removePhoto && (
                <Pressable style={styles.photoAction} onPress={() => setRemovePhoto(false)}>
                  <Text style={styles.photoActionText}>Keep existing photo</Text>
                </Pressable>
              )}
              {!!original?.photoPath && !photoUri && !removePhoto && (
                <Text style={styles.hint}>The existing photo will be kept unless you replace or remove it.</Text>
              )}
            </View>

            <View>
              <SectionHeader title={`What did ${pet?.name ?? "your pet"} do?`} hint="Required" />
              <ActivityGrid selected={activity} onSelect={setActivity} />
              {activity === "Other" && (
                <TextInput style={styles.otherInput} value={customName} onChangeText={setCustomName}
                  placeholder="What activity did you do?" placeholderTextColor={colors.textMuted}
                  maxLength={100} accessibilityLabel="Custom activity name" />
              )}
            </View>

            <View>
              <SectionHeader title="How long?" hint="Optional" />
              <DurationPicker choice={duration} customMinutes={customMinutes}
                onChoose={setDuration} onCustomChange={setCustomMinutes} />
            </View>

            <View>
              <SectionHeader title="When did it happen?" hint="Choose date & time" />
              <WhenField value={date} onChange={setDate} />
            </View>

            {family.some((user) => user.userId !== currentUserId()) && (
              <View>
                <SectionHeader title="Who participated?" hint="Select all that apply" />
                <ParticipantsCard family={family} currentUserId={currentUserId()}
                  selected={participants} onToggle={toggleParticipant} />
              </View>
            )}

            <View>
              <SectionHeader title="Where were you?" hint="Optional" />
              <LocationCard place={place} onChange={setPlace} />
            </View>

            <View style={styles.footer}>
              <Pressable style={[styles.button, !canSave && styles.buttonDisabled]}
                onPress={save} disabled={!canSave} accessibilityRole="button">
                <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>{saving ? "Saving…" : "Save Changes"}</Text>
              </Pressable>
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
  message: { padding: 24, color: colors.text },
  hint: { marginTop: 8, fontSize: 13, color: colors.textMuted },
  photoAction: { alignSelf: "flex-start", paddingVertical: 8 },
  photoActionText: { color: colors.primary, fontFamily: fonts.subheading },
  otherInput: { marginTop: 12, backgroundColor: colors.surface, borderColor: colors.border,
    borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, minHeight: 52,
    color: colors.text, fontSize: 16 },
  footer: { gap: 12 },
  button: { height: 58, borderRadius: 18, backgroundColor: colors.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 18, fontFamily: fonts.heading, color: "#FFFFFF" },
});
