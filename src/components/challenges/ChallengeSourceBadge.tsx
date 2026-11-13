import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";
import { challengeSource } from "@/lib/challengesData";
import type { Challenge } from "@/types/firestore";

const LOOK: Record<
  "ai" | "preset" | "custom",
  {
    label: string;
    a11y: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    bg: string;
    fg: string;
  }
> = {
  ai: {
    label: "AI-made",
    a11y: "AI-generated challenge",
    icon: "sparkles",
    bg: colors.primarySoft,
    fg: colors.primary,
  },
  preset: {
    label: "Preset",
    a11y: "Preset challenge",
    icon: "list",
    bg: colors.track,
    fg: colors.textMuted,
  },
  custom: {
    label: "Custom",
    a11y: "Challenge made by the pet's owner",
    icon: "create",
    bg: colors.openBg,
    fg: colors.openText,
  },
};

/** Small pill showing who made a challenge: the AI, the preset list or the owner. */
export function ChallengeSourceBadge({ challenge }: { challenge: Challenge }) {
  const source = challengeSource(challenge);
  if (!source) return null;
  const look = LOOK[source];
  return (
    <View
      style={[styles.pill, { backgroundColor: look.bg }]}
      accessibilityLabel={look.a11y}
    >
      <Ionicons name={look.icon} size={11} color={look.fg} />
      <Text style={[styles.text, { color: look.fg }]}>{look.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: { fontSize: 11, fontFamily: fonts.heading, letterSpacing: 0.3 },
});
