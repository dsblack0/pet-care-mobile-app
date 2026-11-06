import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityIcon } from '@/components/home/ActivityIcon';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { colors, fonts } from '@/constants/theme';
import { CHALLENGE_ACTIVITIES, onboardingStore, updateAnswers } from '@/lib/onboardingData';

const COPY: Record<(typeof CHALLENGE_ACTIVITIES)[number], { label: string; body: string }> = {
  Feed: { label: 'Feeding', body: 'Meals and treats on time' },
  Walk: { label: 'Walks', body: 'Getting out and moving' },
  Train: { label: 'Training', body: 'Tricks, manners, recall' },
  Play: { label: 'Play', body: 'Games and enrichment' },
  Groom: { label: 'Grooming', body: 'Brushing, baths, nails' },
  Medication: { label: 'Medication', body: 'Doses and vet routines' },
};

export default function OnboardingFocusScreen() {
  const { petName, activityTypes } = onboardingStore.useValue();

  const toggle = (type: string) =>
    updateAnswers({
      activityTypes: activityTypes.includes(type)
        ? activityTypes.filter((t) => t !== type)
        : [...activityTypes, type],
    });

  return (
    <OnboardingShell
      step={4}
      title={`What should ${petName || 'your pet'}’s challenges focus on?`}
      subtitle="Pick everything your family wants to do more of together."
      buttonLabel="Continue"
      disabled={activityTypes.length === 0}
      onPress={() => router.push('/pace')}
    >
      <View style={styles.grid}>
        {CHALLENGE_ACTIVITIES.map((type) => {
          const on = activityTypes.includes(type);
          return (
            <Pressable
              key={type}
              style={[styles.tile, on && styles.tileOn]}
              onPress={() => toggle(type)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <View style={styles.tileTop}>
                <ActivityIcon activityType={type} />
                <View style={[styles.check, on && styles.checkOn]}>
                  {on && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </View>
              <Text style={styles.label}>{COPY[type].label}</Text>
              <Text style={styles.body}>{COPY[type].body}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: {
    width: '48.5%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 4,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  body: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
});
