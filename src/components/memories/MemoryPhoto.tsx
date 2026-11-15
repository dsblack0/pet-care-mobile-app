import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { PetMemoryFace } from "@/components/memories/PetMemoryFace";
import type { Pet } from "@/types/firestore";
import { ACTIVITY_ICONS } from "@/components/home/ActivityIcon";
import { activityTint, fonts } from "@/constants/theme";
import { useImageUrl } from "@/lib/storage";
import type { Memory } from "@/types/firestore";

export const ACTIVITY_TAG: Record<string, string> = {
  Walk: "Walk",
  Feed: "Feed",
  Play: "Play",
  Train: "Training",
  Groom: "Grooming",
  Medication: "Medication",
  Photo: "Photo",
  Other: "Other",
};

type Props = {
  memory: Memory;
  pet?: Pet | null;
  style?: StyleProp<ViewStyle>;
  /** Small label in the middle of the photo, e.g. "Walk" or "1 year ago". */
  tag?: string | null;
};

/** The memory's photo from Storage, or a tinted placeholder with its activity icon. */
export function MemoryPhoto({ memory, pet, style, tag }: Props) {
  const url = useImageUrl(memory.photoPath);
  const tint = activityTint[memory.activityType] ?? activityTint.Other;

  return (
    <View style={[styles.box, { backgroundColor: tint.bg }, style]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} />
      ) : memory.activityType === "Other" && pet ? (
        <PetMemoryFace pet={pet} size={96} />
      ) : (
        <Ionicons
          name={ACTIVITY_ICONS[memory.activityType] ?? "image-outline"}
          size={28}
          color={tint.fg}
          style={styles.icon}
        />
      )}
      {tag && (
        <View style={styles.tag}>
          <Text style={[styles.tagText, { color: tint.fg }]}>{tag}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { opacity: 0.6 },
  tag: {
    position: "absolute",
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  tagText: { fontSize: 12, fontFamily: fonts.heading },
});
