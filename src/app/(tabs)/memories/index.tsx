import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeHeader } from "@/components/home/HomeHeader";
import { auth } from "@/lib/auth";
import { SectionHeader } from "@/components/log/SectionHeader";
import { ACTIVITIES } from "@/components/log/ActivityGrid";
import { MemoryPhoto } from "@/components/memories/MemoryPhoto";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { formatRelativeDay } from "@/lib/format";
import { toDate } from "@/lib/homeData";
import { fetchMemoriesPage, type MemoriesPage } from "@/lib/memoriesData";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import type { Memory } from "@/types/firestore";
import { memoryActivityName } from "@/lib/memoryActivityName";
import { useImageUrl } from "@/lib/storage";
import type { User } from "@/types/firestore";

// Keep filter labels and order consistent with Log Memory.
const ACTIVITY_ORDER = [...ACTIVITIES.filter(({ type }) => type !== "Other"), { type: "Photo", label: "Photo" }, ...ACTIVITIES.filter(({ type }) => type === "Other")];
const NOUN_LABEL: Record<string, string> = Object.fromEntries(ACTIVITY_ORDER.map(({ type, label }) => [type, label]));

function ParticipantAvatar({ user, index }: { user?: User; index: number }) {
  const uri = useImageUrl(user?.profilePhotoPath);
  const name = user?.name?.trim() || "Family member";
  return (
    <View style={[styles.participantAvatar, index > 0 && styles.participantOverlap, { zIndex: 100 - index }]}>
      {uri ? <Image source={{ uri }} style={styles.participantImage} /> : <Text style={styles.participantInitial}>{name.charAt(0).toUpperCase()}</Text>}
    </View>
  );
}

export default function MemoriesScreen() {
  const { pets, pet } = usePets();
  const dataVersion = dataVersionStore.useValue();
  const [page, setPage] = useState<MemoriesPage | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "mine" | "tagged">("all");
  const petId = pet?.petId;

  useEffect(() => {
    if (!petId) return;
    (async () => setPage(await fetchMemoriesPage(petId)))();
  }, [petId, dataVersion]);

  const selectPet = (id: string) => {
    selectedPetStore.set(id);
    setFilter(null);
  };

  const availableTypes = new Set(page?.memories.map((m) => m.activityType) ?? []);
  const types = ACTIVITY_ORDER.filter(({ type }) => availableTypes.has(type));

  const gallery = (page?.memories ?? []).filter(
    (m) => {
      const matchesActivity = !filter || m.activityType === filter;
      const uid = auth.currentUser?.uid;
      const matchesOwnership = ownershipFilter === "all" || (
        !!uid && (ownershipFilter === "mine"
          ? m.createdBy.id === uid
          : m.createdBy.id !== uid && m.participants.some((participant) => participant.id === uid))
      );
      return matchesActivity && matchesOwnership;
    },
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={selectPet}
        eyebrow="Memories"
        compact
      />
      {pet && page && (
        <ScrollView contentContainerStyle={styles.content}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="All"
              active={!filter}
              onPress={() => setFilter(null)}
            />
            {types.map((t) => (
              <Chip
                key={t.type}
                label={t.label}
                active={filter === t.type}
                onPress={() => setFilter(t.type)}
              />
            ))}
          </ScrollView>

          <Pressable
            style={styles.button}
            onPress={() => router.navigate("/log")}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>Log a Memory</Text>
          </Pressable>

          {page.yearAgo && (
            <View>
              <SectionHeader
                title="A year ago today"
                hint={toDate(page.yearAgo.occurredAt).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              />
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/memories/[memoryId]",
                    params: { memoryId: page.yearAgo!.memoryId },
                  })
                }
                style={[styles.card, styles.yearAgo]}
              >
                <MemoryPhoto
                  memory={page.yearAgo}
                  pet={pet}
                  style={styles.yearAgoPhoto}
                  tag="1 year ago"
                />
                {!!page.yearAgo.description && (
                  <Text style={styles.quote}>“{page.yearAgo.description}”</Text>
                )}
                <Text style={styles.meta}>
                  {memoryActivityName(page.yearAgo)}{" "}
                  · Added by{" "}
                  {page.usersById[page.yearAgo.createdBy.id]?.name ?? "someone"}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.button, page.thisMonth.length === 0 && styles.buttonDisabled]}
            onPress={() => router.push("/memories/recap")}
            disabled={page.thisMonth.length === 0}
            accessibilityRole="button"
          >
            <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Generate Memory Collage / Story</Text>
          </Pressable>

          <View>
            <SectionHeader title="Shared family gallery" hint="Newest first" />
            <View style={styles.galleryTabs}>
              {([
                { value: "all", label: "All" },
                { value: "mine", label: "My posts" },
                { value: "tagged", label: "Tagged" },
              ] as const).map((tab) => (
                <Pressable
                  key={tab.value}
                  onPress={() => setOwnershipFilter(tab.value)}
                  style={[styles.galleryTab, ownershipFilter === tab.value && styles.galleryTabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: ownershipFilter === tab.value }}
                >
                  <Text style={[styles.galleryTabText, ownershipFilter === tab.value && styles.galleryTabTextActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
            {gallery.length === 0 && (
              <Text style={styles.meta}>No memories yet.</Text>
            )}
            <View style={styles.grid}>
              {gallery.map((m) => (
                <Pressable
                  key={m.memoryId}
                  style={styles.gridItem}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/memories/[memoryId]",
                      params: { memoryId: m.memoryId },
                    })
                  }
                >
                  <MemoryPhoto
                    memory={m}
                    pet={pet}
                    style={styles.gridPhoto}
                  />
                  <View style={styles.gridFooter}>
                    <View style={styles.gridMetaWrap}>
                      <Text style={styles.gridMeta}>
                        {m.activityType === "Other" ? memoryActivityName(m) : (NOUN_LABEL[m.activityType] ?? m.activityType)} · {formatRelativeDay(toDate(m.occurredAt))}
                      </Text>
                    </View>
                    <View style={styles.participants}>
                      {[...new Set([m.createdBy.id, ...m.participants.map((p) => p.id)])].slice(0, 4).map((id, index) => (
                        <ParticipantAvatar key={id} user={page.usersById[id]} index={index} />
                      ))}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Chip({
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, gap: 24, paddingBottom: 40 },
  chips: { gap: 8 },
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
  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontFamily: fonts.heading, color: "#FFFFFF" },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  yearAgo: { gap: 8 },
  yearAgoPhoto: { height: 170 },
  quote: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.text,
    paddingHorizontal: 4,
  },
  meta: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 4 },
  month: { gap: 12 },
  monthRow: { flexDirection: "row", gap: 8 },
  monthPhoto: { flex: 1, height: 90 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  gridItem: { width: "48%", gap: 4 },
  gridPhoto: { height: 130 },
  gridFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, minWidth: 0 },
  gridMetaWrap: { flex: 1, minWidth: 0, flexShrink: 1 },
  gridMeta: { fontSize: 12, color: colors.textMuted, flexShrink: 1, flexWrap: "wrap" },
  gridDate: { fontSize: 11, color: colors.textMuted },
  galleryTabs: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 14 },
  galleryTab: { flex: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  galleryTabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  galleryTabText: { fontSize: 12, fontFamily: fonts.subheading, color: colors.textMuted, textAlign: "center" },
  galleryTabTextActive: { color: colors.primary },
  participants: { flexDirection: "row", alignItems: "center", paddingRight: 2, flexShrink: 0 },
  participantAvatar: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: colors.background, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  participantOverlap: { marginLeft: -9 },
  participantImage: { width: "100%", height: "100%" },
  participantInitial: { fontSize: 10, fontFamily: fonts.subheading, color: colors.primary },
});
