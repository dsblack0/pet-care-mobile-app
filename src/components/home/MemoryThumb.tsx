import { Image, StyleSheet } from "react-native";

import { ActivityIcon } from "@/components/home/ActivityIcon";
import { useImageUrl } from "@/lib/storage";
import type { Memory } from "@/types/firestore";

/** The memory's photo (loaded from its Storage path), or its activity icon. */
export function MemoryThumb({ memory }: { memory: Memory }) {
  const url = useImageUrl(memory.photoPath);
  if (!url) return <ActivityIcon activityType={memory.activityType} />;
  return <Image source={{ uri: url }} style={styles.thumb} />;
}

const styles = StyleSheet.create({
  thumb: { width: 40, height: 40, borderRadius: 14 },
});
