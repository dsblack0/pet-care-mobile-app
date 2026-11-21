import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebaseConfig";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemoryPhoto } from "@/components/memories/MemoryPhoto";
import { HomeHeader } from "@/components/home/HomeHeader";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { currentUserId } from "@/lib/auth";
import { deleteMemory } from "@/lib/deleteMemory";
import { toDate } from "@/lib/homeData";
import { memoryActivityName } from "@/lib/memoryActivityName";
import { readableLocationLabel, reverseGeocodePlace } from "@/lib/location";
import { ACTIVITIES } from "@/components/log/ActivityGrid";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import { useImageUrl } from "@/lib/storage";
import { fetchMemoriesPage, type MemoriesPage } from "@/lib/memoriesData";
import { getChallengesForPet } from "@/lib/db";
import type { Challenge } from "@/types/firestore";
import type { User } from "@/types/firestore";

function Person({ user, label }: { user?: User; label?: string }) {
  const uri = useImageUrl(user?.profilePhotoPath);
  const name = user?.name || "Family member";
  return <View style={styles.person}>
    <View style={styles.avatar}>{uri ? <Image source={{ uri }} style={styles.avatarImage} /> : <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>}</View>
    <View style={styles.personText}>{label && <Text style={styles.small}>{label}</Text>}<Text style={styles.personName} numberOfLines={1}>{name}</Text></View>
  </View>;
}
function Info({ icon, value, isLocation = false }: { icon: ComponentProps<typeof Ionicons>["name"]; value: string; isLocation?: boolean }) {
  return <View style={[styles.info, isLocation && styles.locationInfo]}><Ionicons name={icon} size={16} color={colors.primary} /><Text style={[styles.infoText, isLocation && styles.locationInfoText]}>{value}</Text></View>;
}
export default function MemoryDetailScreen() {
  const { memoryId } = useLocalSearchParams<{ memoryId: string }>();
  const { pet, pets } = usePets();
  const [page, setPage] = useState<MemoriesPage | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null);
  const [locationLookupFailed, setLocationLookupFailed] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const dataVersion = dataVersionStore.useValue();
  useEffect(() => {
    if (!pet?.petId) return;
    let active = true; setPage(null); setError(false);
    fetchMemoriesPage(pet.petId).then((result) => { if (active) setPage(result); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [pet?.petId, memoryId, dataVersion]);
  useEffect(() => {
    if (!pet?.petId) { setChallenges([]); return; }
    let active = true;
    setChallenges([]);
    getChallengesForPet(pet.petId)
      .then((result) => { if (active) setChallenges(result); })
      .catch(() => { if (active) setChallenges([]); });
    return () => { active = false; };
  }, [pet?.petId, memoryId, dataVersion]);
  const memory = page?.memories.find((item) => item.memoryId === memoryId);
  const date = memory ? toDate(memory.occurredAt) : null;
  const companions = memory?.participants.filter((p) => p.id !== memory.createdBy.id) ?? [];
  // A location chip is only shown for memories that actually contain a place.
  // Use the saved readable label immediately; resolve legacy coordinates when needed.
  const location = memory?.location
    ? (readableLocationLabel(memory.locationLabel) ?? resolvedLocation)
    : readableLocationLabel(memory?.locationLabel);
  // Re-run when returning to this screen (including after granting permission in Settings).
  // Older memories may only have coordinates. Resolve them on-device and persist the
  // label for the creator; other family members can still see a resolved label.
  useFocusEffect(useCallback(() => {
    let active = true;
    setResolvedLocation(null);
    setLocationLookupFailed(false);
    if (memory?.location && !readableLocationLabel(memory.locationLabel)) {
      setResolvingLocation(true);
      reverseGeocodePlace(memory.location).then(async (label) => {
        if (!active) return;
        if (!label) { setLocationLookupFailed(true); return; }
        setResolvedLocation(label);
        if (memory.createdBy.id === currentUserId()) {
          try {
            await updateDoc(doc(db, "memories", memory.memoryId), { locationLabel: label });
          } catch {
            // Still show the resolved address even when the write is unavailable.
          }
        }
      }).catch(() => { if (active) setLocationLookupFailed(true); })
        .finally(() => { if (active) setResolvingLocation(false); });
    } else {
      setResolvingLocation(false);
    }
    return () => { active = false; };
  }, [memory?.memoryId, memory?.location?.latitude, memory?.location?.longitude, memory?.locationLabel]));
  const retryLocation = async () => {
    if (!memory?.location || resolvingLocation) return;
    setResolvingLocation(true);
    setLocationLookupFailed(false);
    try {
      const label = await reverseGeocodePlace(memory.location);
      if (!label) { setLocationLookupFailed(true); return; }
      setResolvedLocation(label);
      if (memory.createdBy.id === currentUserId()) {
        try { await updateDoc(doc(db, "memories", memory.memoryId), { locationLabel: label }); }
        catch { /* Keep the resolved address visible even if the write fails. */ }
      }
    } catch { setLocationLookupFailed(true); }
    finally { setResolvingLocation(false); }
  };
  const activityTag = memory?.activityType === "Other"
    ? memoryActivityName(memory)
    : ACTIVITIES.find((item) => item.type === memory?.activityType)?.label ?? memory?.activityType ?? "";
  // Show challenges this memory qualifies for, not points earned by logging it.
  // Match the same date, activity and eligible-participant rules used by challenge progress.
  const contributedChallenges = memory ? challenges.filter((challenge) => {
    if (challenge.completionStatus === "cancelled") return false;
    const occurred = toDate(memory.occurredAt).getTime();
    return occurred >= toDate(challenge.startDate).getTime()
      && occurred <= toDate(challenge.endDate).getTime()
      && (challenge.activityTypes.length === 0 || challenge.activityTypes.includes(memory.activityType))
      && memory.participants.some((participant) => challenge.participants.some((eligible) => eligible.id === participant.id))
      && (!(challenge.goalType === "shared_activities" || challenge.jointActivity)
        || memory.participants.filter((participant) => challenge.participants.some((eligible) => eligible.id === participant.id)).length >= 2);
  }) : [];
  const canDelete = !!memory && memory.createdBy.id === currentUserId();
  const edit = () => { if (memory && canDelete) router.push({ pathname: "/memories/[memoryId]/edit", params: { memoryId: memory.memoryId } }); };
  const confirmDelete = () => {
    if (!memory || !pet || deleting) return;
    Alert.alert("Delete memory?", "This will remove the memory and recalculate Together Bonus points and challenge rewards.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleting(true);
        try { await deleteMemory(pet.petId, memory.memoryId); router.replace("/memories"); }
        catch (e) { Alert.alert("Could not delete memory", e instanceof Error ? e.message : String(e)); setDeleting(false); }
      } },
    ]);
  };
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <HomeHeader pet={pet} pets={pets} onSelectPet={(id) => selectedPetStore.set(id)} eyebrow="Memories" compact showBack />
    {!page && !error ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> :
      <ScrollView contentContainerStyle={styles.content}>
        {!memory ? <Text style={styles.body}>This memory is unavailable.</Text> : <>
          <View style={styles.card}>
            <View style={styles.postHeader}><Person user={page?.usersById[memory.createdBy.id]} label="Posted by" /><Text style={styles.postDate}>{date?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}{"\n"}{date?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Text></View>
            <MemoryPhoto memory={memory} pet={pet} style={styles.photo} />
            <View style={styles.details}>
              {!!memory.description && <Text style={styles.body}>{memory.description}</Text>}
              <View style={styles.infos}>
                <Info icon="paw-outline" value={activityTag} />
                {memory.durationMinutes != null && memory.durationMinutes > 0 && <Info icon="time-outline" value={`${memory.durationMinutes} minutes`} />}
                {location && <Info icon="location-outline" value={location} isLocation />}
                {!location && !!memory.location && resolvingLocation && <View style={styles.info}><ActivityIndicator size="small" color={colors.primary} /></View>}
                {!location && !!memory.location && locationLookupFailed && <Pressable onPress={retryLocation} style={styles.info} accessibilityRole="button" accessibilityLabel="Retry finding saved memory address"><Ionicons name="location-outline" size={16} color={colors.primary} /><Text style={styles.infoText}>Find address</Text></Pressable>}
              </View>
              {companions.length > 0 && <View style={styles.withSection}><Text style={styles.withTitle}>With</Text><View style={styles.people}>{companions.map((ref) => <Person key={ref.id} user={page?.usersById[ref.id]} />)}</View></View>}
            </View>
          </View>
          {canDelete && <View style={styles.actions}><Pressable onPress={edit} style={styles.editButton} accessibilityRole="button" accessibilityLabel="Edit memory"><Ionicons name="create-outline" size={19} color={colors.primary} /><Text style={styles.editText}>Edit</Text></Pressable><Pressable onPress={confirmDelete} disabled={deleting} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel="Delete memory"><Ionicons name="trash-outline" size={19} color="#B5442A" /><Text style={styles.deleteText}>Delete</Text></Pressable></View>}
          {contributedChallenges.length > 0 && <View style={styles.points}><Ionicons name="paw" size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.pointsTitle}>{contributedChallenges.length === 1 ? "Challenge contributed to" : "Challenges contributed to"}</Text><Text style={styles.pointsSubtitle}>{contributedChallenges.map((challenge) => challenge.title).join(" · ")}</Text></View></View>}
        </>}
      </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 }, back: { width: 32 }, headerTitle: { fontSize: 19, fontFamily: fonts.heading, color: colors.text },
  content: { padding: 18, paddingBottom: 40, gap: 16 }, card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }, postHeader: { padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, postDate: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "right" },
  photo: { height: 330, borderRadius: 0 }, details: { padding: 16, gap: 12 }, title: { fontFamily: fonts.heading, fontSize: 23, color: colors.text }, body: { fontSize: 16, lineHeight: 24, color: colors.text }, infos: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", minWidth: 0 }, info: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", flexShrink: 1, maxWidth: "100%", gap: 6, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 11 }, infoText: { color: colors.text, fontSize: 13, flexShrink: 1, flexWrap: "wrap" }, locationInfo: { width: "100%", maxWidth: "100%", minWidth: 0, alignItems: "flex-start" }, locationInfoText: { flex: 1, minWidth: 0, flexShrink: 1 },
  person: { flexDirection: "row", alignItems: "center", gap: 9, maxWidth: 200 }, avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: 39, height: 39 }, initial: { fontFamily: fonts.heading, fontSize: 17, color: colors.primary }, personText: { flexShrink: 1 }, small: { fontSize: 11, color: colors.textMuted }, personName: { fontSize: 14, fontFamily: fonts.subheading, color: colors.text }, withSection: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }, withTitle: { fontFamily: fonts.subheading, color: colors.text }, people: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 }, editButton: { flexDirection: "row", gap: 6, paddingHorizontal: 16, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primarySoft }, editText: { fontFamily: fonts.subheading, color: colors.primary },
  deleteButton: { flexDirection: "row", gap: 6, paddingHorizontal: 16, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FCE4DC" }, deleteText: { fontFamily: fonts.subheading, color: "#B5442A" },
  points: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 20, backgroundColor: colors.primarySoft, padding: 18 }, pointsTitle: { fontFamily: fonts.heading, fontSize: 19, color: colors.primary }, pointsSubtitle: { color: colors.textMuted, fontSize: 13 },
});
