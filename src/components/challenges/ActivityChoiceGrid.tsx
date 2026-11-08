import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActivityIcon } from "@/components/home/ActivityIcon";
import { colors, fonts } from "@/constants/theme";

const COPY: Record<string, { label: string; body: string }> = {
  Feed: { label: "Feeding", body: "Meals and treats on time" },
  Walk: { label: "Walks", body: "Getting out and moving" },
  Train: { label: "Training", body: "Tricks, manners, recall" },
  Play: { label: "Play", body: "Games and enrichment" },
  Groom: { label: "Grooming", body: "Brushing, baths, nails" },
  Medication: { label: "Medication", body: "Doses and vet routines" },
};

type Props = {
  options: readonly string[];
  selected: string[];
  onToggle: (type: string) => void;
};

/** Two-column tiles for picking several activity types. */
export function ActivityChoiceGrid({ options, selected, onToggle }: Props) {
  return (
    <View style={styles.grid}>
      {options.map((type) => {
        const on = selected.includes(type);
        const copy = COPY[type] ?? { label: type, body: "" };
        return (
          <Pressable
            key={type}
            style={[styles.tile, on && styles.tileOn]}
            onPress={() => onToggle(type)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <View style={styles.tileTop}>
              <ActivityIcon activityType={type} />
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
            </View>
            <Text style={styles.label}>{copy.label}</Text>
            {!!copy.body && <Text style={styles.body}>{copy.body}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  tile: {
    width: "48.5%",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 4,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  body: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
});
