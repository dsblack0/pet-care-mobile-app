import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeHeader } from "@/components/home/HomeHeader";
import { SectionHeader } from "@/components/log/SectionHeader";
import { ACTIVITY_TAG, MemoryPhoto } from "@/components/memories/MemoryPhoto";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { formatRelativeDay } from "@/lib/format";
import { toDate } from "@/lib/homeData";
import { fetchMemoriesPage, type MemoriesPage } from "@/lib/memoriesData";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import type { Memory } from "@/types/firestore";

// Filter chip labels per activity type.
const CHIP_LABEL: Record<string, string> = {
  Walk: "Walks",
  Feed: "Feeds",
  Play: "Play",
  Train: "Training",
  Groom: "Grooming",
  Medication: "Medication",
  Photo: "Photos",
  Other: "Other",
};

export default function MemoriesScreen() {
  const { pets, pet } = usePets();
  const dataVersion = dataVersionStore.useValue();
  const [page, setPage] = useState<MemoriesPage | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const petId = pet?.petId;

  useEffect(() => {
    if (!petId) return;
    (async () => setPage(await fetchMemoriesPage(petId)))();
  }, [petId, dataVersion]);

  const selectPet = (id: string) => {
    selectedPetStore.set(id);
    setFilter(null);
  };

  const names = (m: Memory) =>
    m.participants
      .map((p) => page?.usersById[p.id]?.name ?? "Someone")
      .join(" + ");

  // Chips: All, then each activity type this pet has memories of.
  const types = [...new Set(page?.memories.map((m) => m.activityType) ?? [])];
  const gallery = (page?.memories ?? []).filter(
    (m) => !filter || m.activityType === filter,
  );

  const monthWalks =
    page?.thisMonth.filter((m) => m.activityType === "Walk").length ?? 0;
  const monthShared =
    page?.thisMonth.filter((m) => m.participants.length > 1).length ?? 0;

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
                key={t}
                label={CHIP_LABEL[t] ?? t}
                active={filter === t}
                onPress={() => setFilter(t)}
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
                  style={styles.yearAgoPhoto}
                  tag="1 year ago"
                />
                {!!page.yearAgo.description && (
                  <Text style={styles.quote}>“{page.yearAgo.description}”</Text>
                )}
                <Text style={styles.meta}>
                  {ACTIVITY_TAG[page.yearAgo.activityType] ??
                    page.yearAgo.activityType}{" "}
                  · Added by{" "}
                  {page.usersById[page.yearAgo.createdBy.id]?.name ?? "someone"}
                </Text>
              </Pressable>
            </View>
          )}

          <View>
            <SectionHeader
              title={`This month with ${pet.name}`}
              hint={`${page.thisMonth.length} moment${page.thisMonth.length === 1 ? "" : "s"}`}
            />
            <View style={[styles.card, styles.month]}>
              {page.thisMonth.length > 0 ? (
                <View style={styles.monthRow}>
                  {page.thisMonth.slice(0, 3).map((m) => (
                    <MemoryPhoto
                      key={m.memoryId}
                      memory={m}
                      style={styles.monthPhoto}
                      tag={ACTIVITY_TAG[m.activityType] ?? m.activityType}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.meta}>Nothing logged this month yet.</Text>
              )}
              <Text style={styles.meta}>
                {monthWalks} walk{monthWalks === 1 ? "" : "s"} · {monthShared}{" "}
                family adventure
                {monthShared === 1 ? "" : "s"}
              </Text>
              <Pressable
                style={[
                  styles.button,
                  page.thisMonth.length === 0 && styles.buttonDisabled,
                ]}
                onPress={() => router.push("/memories/recap")}
                disabled={page.thisMonth.length === 0}
                accessibilityRole="button"
              >
                <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  Generate Memory Collage / Story
                </Text>
              </Pressable>
            </View>
          </View>

          <View>
            <SectionHeader title="Shared family gallery" hint="Newest first" />
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
                    style={styles.gridPhoto}
                    tag={ACTIVITY_TAG[m.activityType] ?? m.activityType}
                  />
                  <Text style={styles.gridTitle} numberOfLines={1}>
                    {m.description ||
                      ACTIVITY_TAG[m.activityType] ||
                      m.activityType}
                  </Text>
                  <Text style={styles.gridMeta} numberOfLines={1}>
                    {ACTIVITY_TAG[m.activityType] ?? m.activityType} ·{" "}
                    {names(m)} · {formatRelativeDay(toDate(m.occurredAt))}
                  </Text>
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
  gridTitle: {
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.text,
    marginTop: 4,
  },
  gridMeta: { fontSize: 12, color: colors.textMuted },
});
