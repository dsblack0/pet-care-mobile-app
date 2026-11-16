import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  OnboardingShell,
  onboardingStyles,
} from "@/components/onboarding/OnboardingShell";
import { colors, fonts } from "@/constants/theme";

/** After About you: set up a new pet, or join one the family already added. */
export default function StartScreen() {
  return (
    <OnboardingShell
      backFallback="/about-you"
      title="How are you joining?"
      subtitle="Start fresh with your own pet, or join a pet your family already added."
    >
      <View style={styles.choices}>
        <Choice
          icon="paw"
          tint={colors.peach}
          iconColor={colors.openText}
          title="Add my pet"
          body="Set up your pet’s profile, then invite your family."
          onPress={() => router.push("/pet")}
        />
        <Choice
          icon="mail-open-outline"
          tint={colors.primarySoft}
          iconColor={colors.primary}
          title="Join my family’s pet"
          body="Use the invite code your family sent you."
          onPress={() => router.push("/invite-code")}
        />
      </View>
    </OnboardingShell>
  );
}

function Choice({
  icon,
  tint,
  iconColor,
  title,
  body,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  iconColor: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[onboardingStyles.card, styles.choice]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
    >
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choices: { gap: 12 },
  choice: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontFamily: fonts.heading, color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
});
