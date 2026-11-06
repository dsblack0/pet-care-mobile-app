import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell, onboardingStyles } from '@/components/onboarding/OnboardingShell';
import { colors, fonts } from '@/constants/theme';
import { onboardingStore, updateAnswers } from '@/lib/onboardingData';

const MIN = 1;
const MAX = 7;

function paceLabel(n: number): { title: string; body: string } {
  if (n <= 2) return { title: 'Easy going', body: 'A couple of goals to fit around a busy week.' };
  if (n <= 4) return { title: 'Steady', body: 'Something to work on most days.' };
  return { title: 'All in', body: 'A new goal almost every day.' };
}

export default function OnboardingPaceScreen() {
  const { weeklyCount } = onboardingStore.useValue();
  const pace = paceLabel(weeklyCount);

  const step = (delta: number) =>
    updateAnswers({ weeklyCount: Math.min(MAX, Math.max(MIN, weeklyCount + delta)) });

  return (
    <OnboardingShell
      step={5}
      title="How many challenges a week?"
      subtitle="Start with what feels doable for your family."
      buttonLabel="Continue"
      onPress={() => router.push('/care-notes')}
    >
      <View style={[onboardingStyles.card, styles.card]}>
        <View style={styles.stepper}>
          <StepButton icon="remove" onPress={() => step(-1)} disabled={weeklyCount <= MIN} />
          <View style={styles.countBox}>
            <Text style={styles.count}>{weeklyCount}</Text>
            <Text style={styles.unit}>{weeklyCount === 1 ? 'challenge' : 'challenges'}</Text>
          </View>
          <StepButton icon="add" onPress={() => step(1)} disabled={weeklyCount >= MAX} />
        </View>

        <View style={styles.dots}>
          {Array.from({ length: MAX }, (_, i) => (
            <View key={i} style={[styles.dot, i < weeklyCount && styles.dotOn]} />
          ))}
        </View>

        <View style={styles.pace}>
          <Text style={styles.paceTitle}>{pace.title}</Text>
          <Text style={styles.paceBody}>{pace.body}</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

function StepButton({
  icon,
  onPress,
  disabled,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      style={[styles.stepButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={icon === 'add' ? 'More' : 'Fewer'}
    >
      <Ionicons name={icon} size={26} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 20, paddingVertical: 24 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  countBox: { alignItems: 'center', minWidth: 110 },
  count: { fontSize: 64, lineHeight: 72, fontFamily: fonts.heading, color: colors.text },
  unit: { fontSize: 14, fontFamily: fonts.subheading, color: colors.textMuted },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 28, height: 8, borderRadius: 4, backgroundColor: colors.track },
  dotOn: { backgroundColor: colors.primary },
  pace: {
    alignSelf: 'stretch',
    backgroundColor: colors.butter,
    borderRadius: 16,
    padding: 14,
    gap: 2,
  },
  paceTitle: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  paceBody: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
});
