import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
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
import { MemoryPhoto, ACTIVITY_TAG } from "@/components/memories/MemoryPhoto";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { toDate } from "@/lib/homeData";
import { fetchMemoriesPage, type MemoriesPage } from "@/lib/memoriesData";

export default function MemoryDetailScreen() {
  const { memoryId } = useLocalSearchParams<{ memoryId: string }>();
  const { pet } = usePets();
  const [page, setPage] = useState<MemoriesPage | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!pet?.petId) return;
    let active = true;
    setPage(null);
    setError(false);
    fetchMemoriesPage(pet.petId)
      .then((result) => {
        if (active) setPage(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [pet?.petId]);
  const memory = page?.memories.find((item) => item.memoryId === memoryId);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Pressable
        style={styles.back}
        onPress={() => router.back()}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.backText}>Memories</Text>
      </Pressable>
      {!page && !error ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!memory ? (
            <Text style={styles.body}>This memory is unavailable.</Text>
          ) : (
            <>
              <Text style={styles.title}>
                {ACTIVITY_TAG[memory.activityType] ?? memory.activityType}
              </Text>
              <Text style={styles.meta}>
                {toDate(memory.occurredAt).toLocaleString()}
              </Text>
              <MemoryPhoto
                memory={memory}
                style={styles.photo}
                tag={ACTIVITY_TAG[memory.activityType] ?? memory.activityType}
              />
              {!!memory.description && (
                <Text style={styles.body}>{memory.description}</Text>
              )}
              <Text style={styles.meta}>
                Added by{" "}
                {page?.usersById[memory.createdBy.id]?.name ??
                  "a family member"}
              </Text>
              <Text style={styles.meta}>
                With{" "}
                {memory.participants
                  .map((p) => page?.usersById[p.id]?.name ?? "a family member")
                  .join(", ") || "no participants listed"}
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  back: { flexDirection: "row", alignItems: "center", gap: 10, padding: 18 },
  backText: { color: colors.text, fontSize: 16 },
  content: { padding: 20, gap: 16 },
  title: { color: colors.text, fontSize: 26, fontFamily: fonts.heading },
  photo: { height: 300 },
  body: { color: colors.text, fontSize: 17, lineHeight: 25 },
  meta: { color: colors.textMuted, fontSize: 14 },
});
