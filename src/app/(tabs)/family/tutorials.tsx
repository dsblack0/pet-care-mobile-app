import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/HomeHeader';
import { SectionHeader } from '@/components/log/SectionHeader';
import { colors, fonts } from '@/constants/theme';
import { usePets } from '@/hooks/usePets';
import { selectedPetStore } from '@/lib/store';

const steps = (petName: string) => [
  { title: `Choose ${petName}`, body: 'Use the pet name in the header to switch pets.' },
  { title: 'Log daily care', body: 'Add walks, meals, play, and medication.' },
  { title: 'Complete challenges', body: 'Work together and earn Points.' },
  { title: 'Save memories', body: 'Turn family activities into stories.' },
];

// Answers other than the first are placeholder copy; adjust to match the app.
const faqs = (petName: string) => [
  {
    q: 'How do the points work?',
    a: `${petName} earns points whenever your family logs care, completes activities, or finishes a challenge together.`,
  },
  {
    q: 'Who can see our memories?',
    a: `Only family members who've joined ${petName} can see ${petName}'s memories.`,
  },
  {
    q: 'Can I change challenge participants?',
    a: 'Yes. Weekly challenges are made from your challenge preferences, so update who takes part there.',
  },
  {
    q: 'How do I add another pet?',
    a: 'Open your profile and tap Add another pet.',
  },
];

export default function TutorialsScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const { pets, pet } = usePets();
  const petName = pet?.name ?? 'your pet';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        eyebrow="Help Center"
        title="Tutorials & FAQs"
        compact
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          A quick guide to caring for {petName}, sharing activities, and saving your favorite
          moments.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick-start tutorial</Text>
            <Text style={styles.link}>4 steps</Text>
          </View>
          {steps(petName).map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View>
          <SectionHeader title="Frequently asked questions" />
          <View style={[styles.card, styles.faqCard]}>
            {faqs(petName).map((f, i) => {
              const open = openIndex === i;
              return (
                <View key={f.q} style={i > 0 && styles.divider}>
                  <Pressable
                    style={styles.faqRow}
                    onPress={() => setOpenIndex(open ? null : i)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <Text style={styles.faqQ}>{f.q}</Text>
                    <Ionicons name={open ? 'remove' : 'add'} size={20} color={colors.primary} />
                  </Pressable>
                  {open && <Text style={styles.faqA}>{f.a}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => router.navigate('/')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 12, gap: 24, paddingBottom: 40 },
  intro: { fontSize: 16, lineHeight: 23, color: colors.textMuted },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontSize: 19, fontFamily: fonts.heading, color: colors.text },
  link: { fontSize: 14, fontFamily: fonts.subheading, color: colors.primary },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNum: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 16, fontFamily: fonts.heading, color: '#C06A1F' },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  stepBody: { fontSize: 14, color: colors.textMuted },
  faqCard: { paddingVertical: 4, gap: 0 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 16,
  },
  faqQ: { flex: 1, fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  faqA: { fontSize: 14, lineHeight: 21, color: colors.textMuted, paddingBottom: 16 },
  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },
});
