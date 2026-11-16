import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { colors, fonts } from "@/constants/theme";
import { pendingInvitation } from "@/lib/pendingInvite";
import { saveAboutYou } from "@/lib/profileData";
import {
  AGE_RANGES,
  INTERESTS,
  type AgeRange,
  type Interest,
} from "../../../models/users";

export default function AboutYouScreen() {
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (interest: Interest) =>
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest],
    );

  const submit = async () => {
    if (!ageRange) return;
    setBusy(true);
    setError(null);
    try {
      await saveAboutYou(ageRange, interests);
      const token = await pendingInvitation();
      if (token)
        router.replace({
          pathname: "/invite/[invitationId]",
          params: { invitationId: token },
        });
      else router.push("/start");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // Ready again if they come back from the next screen to change answers.
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      canGoBack={false}
      title="Let’s get to know you"
      subtitle="Your answers help Pawmily pick challenges your family will enjoy."
      buttonLabel="Continue"
      onPress={() => void submit()}
      busy={busy}
      disabled={!ageRange}
      error={error}
    >
      <View style={styles.section}>
        <Text style={styles.question}>How old are you?</Text>
        <View style={styles.chips}>
          {AGE_RANGES.map((range) => (
            <Chip
              key={range}
              label={range}
              selected={ageRange === range}
              onPress={() => setAgeRange(range)}
            />
          ))}
        </View>
        <Text style={styles.hint}>Pawmily is for ages 13 and up.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.questionRow}>
          <Text style={styles.question}>What do you enjoy?</Text>
          <Text style={styles.hint}>Pick any</Text>
        </View>
        <View style={styles.chips}>
          {INTERESTS.map((interest) => (
            <Chip
              key={interest}
              label={interest}
              selected={interests.includes(interest)}
              onPress={() => toggle(interest)}
            />
          ))}
        </View>
      </View>
    </OnboardingShell>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  questionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  question: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: 15, fontWeight: "600", color: colors.text },
  chipTextSelected: { color: colors.primary },
});
