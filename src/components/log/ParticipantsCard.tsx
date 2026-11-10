import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";
import { initial } from "@/lib/format";
import type { User } from "@/types/firestore";

type Props = {
  family: User[];
  currentUserId: string;
  selected: string[];
  onToggle: (userId: string) => void;
  /** Replaces the Together Bonus hint, for forms outside Log Activity. */
  hint?: string;
};

export function ParticipantsCard({
  family,
  currentUserId,
  selected,
  onToggle,
  hint: customHint,
}: Props) {
  // Current user first, labelled "You".
  const people = [...family].sort((a, b) =>
    a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : 0,
  );
  const nameOf = (u: User) => (u.userId === currentUserId ? "You" : u.name);
  const selectedNames = people
    .filter((u) => selected.includes(u.userId))
    .map(nameOf);

  const hint =
    customHint ??
    (selectedNames.length > 1
      ? `${selectedNames.join(" + ")} selected · eligible for Together Bonus`
      : selectedNames.length === 1
        ? `${selectedNames[0]} selected · add someone for a Together Bonus`
        : "Pick at least one person");

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {people.map((u) => {
          const active = selected.includes(u.userId);
          return (
            <Pressable
              key={u.userId}
              style={styles.person}
              onPress={() => onToggle(u.userId)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={nameOf(u)}
            >
              <View style={[styles.avatar, active && styles.avatarActive]}>
                <Text
                  style={[styles.avatarText, active && styles.avatarTextActive]}
                >
                  {initial(u.name)}
                </Text>
                {active && (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.name, active && styles.nameActive]}>
                {nameOf(u)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.hint}>
        <Ionicons name="people" size={16} color={colors.primary} />
        <Text style={styles.hintText}>{hint}</Text>
      </View>
    </View>
  );
}

const AVATAR = 56;

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", justifyContent: "space-around" },
  person: { alignItems: "center", gap: 6 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.peach,
    borderWidth: 3,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  avatarText: { fontSize: 20, fontFamily: fonts.heading, color: colors.text },
  avatarTextActive: { color: colors.primary },
  check: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, color: colors.textMuted },
  nameActive: { fontFamily: fonts.subheading, color: colors.text },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  hintText: { flex: 1, fontSize: 13, color: colors.text },
});
