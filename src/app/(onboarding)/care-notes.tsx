import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fieldStyles } from '@/components/form/fieldStyles';
import { OnboardingShell, onboardingStyles } from '@/components/onboarding/OnboardingShell';
import { colors, fonts } from '@/constants/theme';
import { onboardingStore, updateAnswers } from '@/lib/onboardingData';

const SUGGESTIONS = [
  'Low energy',
  'Short walks only',
  'Food allergies',
  'Special diet',
  'Shy with strangers',
  'Indoor only',
  'Recovering from an injury',
];

export default function OnboardingCareNotesScreen() {
  const { petName, restrictions } = onboardingStore.useValue();
  const [other, setOther] = useState('');
  const name = petName || 'your pet';

  const toggle = (note: string) =>
    updateAnswers({
      restrictions: restrictions.includes(note)
        ? restrictions.filter((r) => r !== note)
        : [...restrictions, note],
    });

  const addOther = () => {
    const note = other.trim();
    if (note && !restrictions.includes(note)) updateAnswers({ restrictions: [...restrictions, note] });
    setOther('');
  };

  // Suggestions first, then anything typed in.
  const chips = [...SUGGESTIONS, ...restrictions.filter((r) => !SUGGESTIONS.includes(r))];

  return (
    <OnboardingShell
      step={6}
      title="Anything we should work around?"
      subtitle={`Challenges will skip anything that isn’t right for ${name}.`}
      buttonLabel={restrictions.length ? 'Continue' : 'Nothing to note'}
      onPress={() => router.push('/plan')}
    >
      <View style={styles.chips}>
        {chips.map((note) => {
          const on = restrictions.includes(note);
          return (
            <Pressable
              key={note}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => toggle(note)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              {on && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{note}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={onboardingStyles.card}>
        <Text style={fieldStyles.label}>Something else</Text>
        <View style={styles.row}>
          <TextInput
            value={other}
            onChangeText={setOther}
            placeholder={`e.g. ${name} doesn’t like baths`}
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addOther}
            returnKeyType="done"
            style={[fieldStyles.box, fieldStyles.inputText, styles.input]}
          />
          <Pressable
            style={[styles.add, !other.trim() && styles.disabled]}
            onPress={addOther}
            disabled={!other.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add note"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 15, color: colors.text },
  chipTextOn: { fontFamily: fonts.subheading, color: colors.primary },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, minWidth: 0 },
  add: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
});
