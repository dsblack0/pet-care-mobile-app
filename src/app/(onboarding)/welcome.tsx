import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import {
  FooterLink,
  OnboardingShell,
} from "@/components/onboarding/OnboardingShell";
import { PetFace } from "@/components/pet/PetFace";
import { colors, fonts } from "@/constants/theme";

const POINTS = [
  {
    title: "Share the care",
    body: "Everyone logs walks, meals and play in one place.",
  },
  {
    title: "Weekly challenges",
    body: "Small goals the whole family works on together.",
  },
  { title: "Keep the memories", body: "Photos and moments, saved as you go." },
];

export default function WelcomeScreen() {
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);

  return (
    <OnboardingShell
      title="Welcome to Pawmily"
      subtitle="Caring for your pet works better as a team."
      hero={
        <View style={styles.hero}>
          <View style={styles.halo}>
            <PetFace
              species="Dog"
              mood="happy"
              size={150}
              scrollY={scrollY}
              atBottom={atBottom}
            />
          </View>
        </View>
      }
      buttonLabel="Sign in"
      onPress={() => router.push("/sign-in")}
      footer={
        <>
          <FooterLink
            label="Create a new account"
            onPress={() => router.push("/create-account")}
          />
          <FooterLink
            label="Have an invitation code?"
            onPress={() => router.push("/invite-code")}
          />
        </>
      }
    >
      <View style={styles.points}>
        {POINTS.map((p, i) => (
          <View key={p.title} style={styles.point}>
            <View style={styles.dot}>
              <Text style={styles.dotText}>{i + 1}</Text>
            </View>
            <View style={styles.pointText}>
              <Text style={styles.pointTitle}>{p.title}</Text>
              <Text style={styles.pointBody}>{p.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 8 },
  halo: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  points: { gap: 14 },
  point: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: { fontSize: 15, fontFamily: fonts.heading, color: colors.primary },
  pointText: { flex: 1, gap: 2 },
  pointTitle: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.text,
  },
  pointBody: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
});
