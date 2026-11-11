import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import type { Memory, User } from "@/types/firestore";

export default function EditMemoryScreen() {
  const { memoryId } = useLocalSearchParams<{ memoryId: string }>();
  const { pet } = usePets();
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
      const m = memories.find((item) => item.memoryId === memoryId) ?? null;
      setOriginal(m); setFamily(users);
      if (m) {
        setActivity(m.activityType); setCustomName(m.customActivityName ?? "");
        setDate(toDate(m.occurredAt)); setCaption(m.description ?? "");
        setDuration(m.durationMinutes ?? null); setParticipants(m.participants.map((p) => p.id));
        setPlace(m.location ? { latitude: m.location.latitude, longitude: m.location.longitude, label: m.locationLabel ?? "Saved location" } : null);
      }
    }).catch((e) => Alert.alert("Unable to load memory", String(e))).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pet?.petId, memoryId]);
  const own = !!original && original.createdBy.id === currentUserId();
  const minutes = duration === "custom" ? Number(customMinutes) : duration;
  const save = async () => {
    if (!pet || !original || !own || saving) return;
    if (activity === "Other" && !customName.trim()) return Alert.alert("Activity name required", "Please name your Other activity.");
    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) return Alert.alert("Invalid duration", "Enter a positive number of minutes, or select None.");
    setSaving(true);
    try {
      await editMemory({ petId: pet.petId, memoryId: original.memoryId, activityType: activity, customActivityName: customName, description: caption, occurredAt: date, durationMinutes: minutes, participants, location: place, photoUri, removePhoto });
      router.replace({ pathname: "/memories/[memoryId]", params: { memoryId: original.memoryId } });
    } catch (e) { Alert.alert("Could not save changes", e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <View style={styles.header}><Pressable onPress={() => router.back()} accessibilityRole="button"><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><Text style={styles.heading}>Edit memory</Text><View style={{ width: 24 }} /></View>
    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : !own ? <Text style={styles.message}>Only the person who posted this memory can edit it.</Text> :
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionHeader title="Activity" /><ActivityGrid selected={activity} onSelect={setActivity} />
        {activity === "Other" && <TextInput style={styles.input} placeholder="Name your activity" placeholderTextColor={colors.textMuted} value={customName} onChangeText={setCustomName} maxLength={80} />}
        <SectionHeader title="When" /><WhenField value={date} onChange={setDate} />
        <SectionHeader title="Duration (optional)" /><DurationPicker choice={duration} customMinutes={customMinutes} onChoose={setDuration} onCustomChange={setCustomMinutes} />
        <SectionHeader title="With" /><ParticipantsCard family={family} currentUserId={currentUserId()} selected={participants} onToggle={(id) => { if (id !== currentUserId()) setParticipants((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]); }} />
        <SectionHeader title="Location (optional)" /><LocationCard place={place} onChange={setPlace} />
        <SectionHeader title="Photo and caption" />
        <Text style={styles.hint}>The existing photo stays unless you remove or replace it.</Text>
        <MemoryCard petName={pet?.name ?? "your pet"} photoUri={photoUri} caption={caption} onPhotoChange={(uri) => { setPhotoUri(uri); setRemovePhoto(uri === null); }} onCaptionChange={setCaption} />
        {!!original.photoPath && !photoUri && !removePhoto && <Pressable style={styles.remove} onPress={() => setRemovePhoto(true)}><Text style={styles.removeText}>Remove existing photo</Text></Pressable>}
        {removePhoto && <Pressable style={styles.remove} onPress={() => setRemovePhoto(false)}><Text style={styles.removeText}>Keep existing photo</Text></Pressable>}
        <Pressable style={[styles.save, saving && styles.disabled]} onPress={save} disabled={saving} accessibilityRole="button"><Text style={styles.saveText}>{saving ? "Saving…" : "Save changes"}</Text></Pressable>
      </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18 }, heading: { fontSize: 19, fontFamily: fonts.heading, color: colors.text }, content: { padding: 18, paddingBottom: 48, gap: 14 }, message: { padding: 24, color: colors.text }, input: { borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, color: colors.text, fontSize: 16 }, hint: { fontSize: 13, color: colors.textMuted }, remove: { alignSelf: "flex-start", paddingVertical: 8 }, removeText: { color: colors.primary, fontFamily: fonts.subheading }, save: { backgroundColor: colors.primary, borderRadius: 16, padding: 17, alignItems: "center", marginTop: 12 }, disabled: { opacity: 0.6 }, saveText: { color: "#FFFFFF", fontFamily: fonts.heading, fontSize: 16 },
});
