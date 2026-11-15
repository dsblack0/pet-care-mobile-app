import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemoryPhoto, ACTIVITY_TAG } from "@/components/memories/MemoryPhoto";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { currentUserId } from "@/lib/auth";
import { deleteMemory } from "@/lib/deleteMemory";
import { toDate } from "@/lib/homeData";
import { memoryActivityName } from "@/lib/memoryActivityName";
import { dataVersionStore } from "@/lib/store";
import { useImageUrl } from "@/lib/storage";
import { fetchMemoriesPage, type MemoriesPage } from "@/lib/memoriesData";
import type { User } from "@/types/firestore";

function Person({ user, label }: { user?: User; label?: string }) {
  const uri = useImageUrl(user?.profilePhotoPath);
  const name = user?.name || "Family member";
  return <View style={styles.person}>
    <View style={styles.avatar}>{uri ? <Image source={{ uri }} style={styles.avatarImage} /> : <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>}</View>
    <View style={styles.personText}>{label && <Text style={styles.small}>{label}</Text>}<Text style={styles.personName} numberOfLines={1}>{name}</Text></View>
  </View>;
}
function Info({ icon, value }: { icon: ComponentProps<typeof Ionicons>["name"]; value: string }) {
  return <View style={styles.info}><Ionicons name={icon} size={16} color={colors.primary} /><Text style={styles.infoText}>{value}</Text></View>;
}
export default function MemoryDetailScreen() {
  const { memoryId } = useLocalSearchParams<{ memoryId: string }>();
  const { pet } = usePets();
  const [page, setPage] = useState<MemoriesPage | null>(null);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dataVersion = dataVersionStore.useValue();
  useEffect(() => {
    if (!pet?.petId) return;
    let active = true; setPage(null); setError(false);
    fetchMemoriesPage(pet.petId).then((result) => { if (active) setPage(result); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [pet?.petId, memoryId, dataVersion]);
  const memory = page?.memories.find((item) => item.memoryId === memoryId);
  const date = memory ? toDate(memory.occurredAt) : null;
  const companions = memory?.participants.filter((p) => p.id !== memory.createdBy.id) ?? [];
  const locationLabel = memory?.locationLabel ?? "";
  const location = memory?.location ? (locationLabel || `${memory.location.latitude.toFixed(4)}, ${memory.location.longitude.toFixed(4)}`) : null;
  const points = memory ? memory.basePoints + memory.bonusPoints : 0;
  const canDelete = !!memory && memory.createdBy.id === currentUserId();
  const edit = () => { if (memory && canDelete) router.push({ pathname: "/memories/[memoryId]/edit", params: { memoryId: memory.memoryId } }); };
  const confirmDelete = () => {
    if (!memory || !pet || deleting) return;
    Alert.alert("Delete memory?", "This will remove the memory and reverse its activity points and challenge progress.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleting(true);
        try { await deleteMemory(pet.petId, memory.memoryId); router.replace("/memories"); }
        catch (e) { Alert.alert("Could not delete memory", e instanceof Error ? e.message : String(e)); setDeleting(false); }
      } },
    ]);
  };
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button"><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><Text style={styles.headerTitle}>Memory</Text>{canDelete ? <View style={styles.actions}><Pressable onPress={edit} style={styles.editButton} accessibilityRole="button" accessibilityLabel="Edit memory"><Ionicons name="create-outline" size={19} color={colors.primary} /></Pressable><Pressable onPress={confirmDelete} disabled={deleting} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel="Delete memory"><Ionicons name="trash-outline" size={19} color="#B5442A" /></Pressable></View> : <View style={styles.back} />}</View>
    {!page && !error ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> :
      <ScrollView contentContainerStyle={styles.content}>
        {!memory ? <Text style={styles.body}>This memory is unavailable.</Text> : <>
          <View style={styles.card}>
            <View style={styles.postHeader}><Person user={page?.usersById[memory.createdBy.id]} label="Posted by" /><Text style={styles.postDate}>{date?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}{"\n"}{date?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Text></View>
            <MemoryPhoto memory={memory} pet={pet} style={styles.photo} />
            <View style={styles.details}>
              <Text style={styles.title}>{memoryActivityName(memory)}</Text>
              {!!memory.description && <Text style={styles.body}>{memory.description}</Text>}
              <View style={styles.infos}>
                <Info icon="paw-outline" value={memoryActivityName(memory)} />
                {memory.durationMinutes != null && memory.durationMinutes > 0 && <Info icon="time-outline" value={`${memory.durationMinutes} minutes`} />}
                {location && <Info icon="location-outline" value={location} />}
              </View>
              {companions.length > 0 && <View style={styles.withSection}><Text style={styles.withTitle}>With</Text><View style={styles.people}>{companions.map((ref) => <Person key={ref.id} user={page?.usersById[ref.id]} />)}</View></View>}
            </View>
          </View>
          {points > 0 && <View style={styles.points}><Ionicons name="paw" size={24} color={colors.primary} /><View><Text style={styles.pointsTitle}>+{points} points</Text><Text style={styles.pointsSubtitle}>Earned for your family</Text></View></View>}
        </>}
      </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 }, back: { width: 32 }, headerTitle: { fontSize: 19, fontFamily: fonts.heading, color: colors.text },
  content: { padding: 18, paddingBottom: 40, gap: 16 }, card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }, postHeader: { padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, postDate: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "right" },
  photo: { height: 330, borderRadius: 0 }, details: { padding: 16, gap: 12 }, title: { fontFamily: fonts.heading, fontSize: 23, color: colors.text }, body: { fontSize: 16, lineHeight: 24, color: colors.text }, infos: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, info: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 11 }, infoText: { color: colors.text, fontSize: 13 },
  person: { flexDirection: "row", alignItems: "center", gap: 9, maxWidth: 200 }, avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: 39, height: 39 }, initial: { fontFamily: fonts.heading, fontSize: 17, color: colors.primary }, personText: { flexShrink: 1 }, small: { fontSize: 11, color: colors.textMuted }, personName: { fontSize: 14, fontFamily: fonts.subheading, color: colors.text }, withSection: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }, withTitle: { fontFamily: fonts.subheading, color: colors.text }, people: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  actions: { flexDirection: "row", gap: 8 }, editButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primarySoft },
  deleteButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FCE4DC" },
  points: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 20, backgroundColor: colors.primarySoft, padding: 18 }, pointsTitle: { fontFamily: fonts.heading, fontSize: 19, color: colors.primary }, pointsSubtitle: { color: colors.textMuted, fontSize: 13 },
});
