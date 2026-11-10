import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";
import { challengeSource } from "@/lib/challengesData";
import type { Challenge } from "@/types/firestore";

/** Small pill marking an AI-generated or preset challenge. Shows nothing for older challenges. */
export function ChallengeSourceBadge({ challenge }: { challenge: Challenge }) {
  const source = challengeSource(challenge);
  if (!source) return null;
  const ai = source === "ai";
  return (
    <View
      style={[styles.pill, ai ? styles.aiPill : styles.presetPill]}
      accessibilityLabel={ai ? "AI-generated challenge" : "Preset challenge"}
    >
      <Ionicons
        name={ai ? "sparkles" : "list"}
        size={11}
        color={ai ? colors.primary : colors.textMuted}
      />
      <Text style={[styles.text, ai ? styles.aiText : styles.presetText]}>
        {ai ? "AI-made" : "Preset"}
      </Text>
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
  aiPill: { backgroundColor: colors.primarySoft },
  presetPill: { backgroundColor: colors.track },
  text: { fontSize: 11, fontFamily: fonts.heading, letterSpacing: 0.3 },
  aiText: { color: colors.primary },
  presetText: { color: colors.textMuted },
});
