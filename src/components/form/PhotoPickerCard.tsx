import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, fonts } from "@/constants/theme";

type Props = {
  photoUri: string | null;
  emptyLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

/** Shared photo picker card for pet and user profile photos. */
export function PhotoPickerCard({
  photoUri,
  emptyLabel,
  onPress,
  disabled = false,
}: Props) {
  return (
    <View style={[styles.card, styles.photoCard]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Ionicons name="image-outline" size={30} color={colors.textMuted} />
          <Text style={styles.photoEmptyText}>{emptyLabel}</Text>
        </View>
      )}
      <Pressable
        style={[styles.photoButton, disabled && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={photoUri ? "Change photo" : "Add photo"}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.photoButtonText}>
          {photoUri ? "Change photo" : "Add photo"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  photoCard: { alignItems: "center", gap: 12 },
  photo: { width: 110, height: 110, borderRadius: 24 },
  photoEmpty: {
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoEmptyText: { fontSize: 12, color: colors.textMuted },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
  },
  photoButtonText: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
  },
  buttonDisabled: { opacity: 0.45 },
});
