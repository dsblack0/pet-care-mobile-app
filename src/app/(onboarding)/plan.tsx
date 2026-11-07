import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { PetFace } from '@/components/pet/PetFace';
import { colors, fonts } from '@/constants/theme';
import { finishOnboarding, onboardingStore, type ChallengePlan } from '@/lib/onboardingData';

// Placeholder until in-app purchases are set up. Nothing is charged yet.
const PLUS_PRICE = '$4.99 / month';

export default function OnboardingPlanScreen() {
  const { petName, species, restrictions } = onboardingStore.useValue();
  const [plan, setPlan] = useState<ChallengePlan>('plus');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);
  const name = petName || 'your pet';
  const kind = species ? species.toLowerCase() : 'pet';

  // On success the session switches to "ready" and the root layout shows the tabs.
  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await finishOnboarding(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      title={`How should we make ${name}’s challenges?`}
      subtitle="You’re all set up. Pick the kind of weekly challenges your family gets."
      hero={
        <View style={styles.hero}>
          <View style={styles.halo}>
            <PetFace species={species || 'Dog'} mood="happy" size={88} scrollY={scrollY} atBottom={atBottom} />
          </View>
        </View>
      }
      buttonLabel={plan === 'plus' ? 'Start Pawmily Plus' : 'Continue with free challenges'}
      onPress={finish}
      busy={busy}
      error={error}
    >
      <PlanCard
        selected={plan === 'plus'}
        onPress={() => setPlan('plus')}
        badge="Custom"
        title="Pawmily Plus"
        price={PLUS_PRICE}
        points={[
          `Challenges written for ${name} from your answers`,
          restrictions.length
            ? `Works around ${restrictions.length === 1 ? 'your note' : `your ${restrictions.length} notes`}`
            : 'Fits your family’s pace and focus',
          'Adjusts each week to what your family finished',
        ]}
      />
      <PlanCard
        selected={plan === 'free'}
        onPress={() => setPlan('free')}
        title="Free"
        price="$0"
        points={[`A starter set of challenges for ${kind}s`, 'Covers the care areas you picked']}
      />
    </OnboardingShell>
  );
}

function PlanCard({
  selected,
  onPress,
  badge,
  title,
  price,
  points,
}: {
  selected: boolean;
  onPress: () => void;
  badge?: string;
  title: string;
  price: string;
  points: string[];
}) {
  return (
    <Pressable
      style={[styles.card, selected && styles.cardOn]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.cardTop}>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected && <View style={styles.radioDot} />}
        </View>
        <View style={styles.cardTitleBox}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            {badge && (
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
      <View style={styles.points}>
        {points.map((p) => (
          <View key={p} style={styles.point}>
            <Ionicons name="checkmark-circle" size={18} color={selected ? colors.primary : colors.textMuted} />
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  halo: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  cardOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  cardTitleBox: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  badgeText: { fontSize: 12, fontFamily: fonts.subheading, color: colors.primary },
  price: { fontSize: 14, fontFamily: fonts.subheading, color: colors.textMuted },
  points: { gap: 8, paddingLeft: 36 },
  point: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  pointText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
});
