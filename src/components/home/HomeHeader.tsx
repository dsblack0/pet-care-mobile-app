import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PetSwitcherSheet } from '@/components/pet/PetSwitcherSheet';

import { colors, fonts } from '@/constants/theme';
import type { Pet } from '@/types/firestore';

type Props = {
  pet: Pet | null;
  pets: Pet[];
  onSelectPet: (petId: string) => void;
  /** Shown before the pet name, e.g. the mini pet face. */
  leading?: ReactNode;
  /** Small label above the pet name, e.g. "Log Activity". */
  eyebrow?: string;
  /** Icon-only Rewards button, for screens with less room. */
  compact?: boolean;
  /** Shown in place of the pet switcher, e.g. "Tutorials & FAQs". */
  title?: string;
};

export function HomeHeader({ pet, pets, onSelectPet, leading, eyebrow, compact, title }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.bar}>
      <Pressable
        style={styles.petButton}
        onPress={() => setPickerOpen(true)}
        disabled={!!title}
        accessibilityRole="button"
        accessibilityLabel="Switch pet"
      >
        {leading}
        <View>
          {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <View style={styles.petNameRow}>
            <Text style={styles.petName}>{title ?? pet?.name ?? ''}</Text>
            {!title && <Ionicons name="chevron-down" size={20} color={colors.text} />}
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={styles.circle}
          onPress={() => router.push('/family/tutorials')}
          accessibilityRole="button"
          accessibilityLabel="Help"
        >
          <Ionicons name="help" size={20} color={colors.primary} />
        </Pressable>
        {compact ? (
          <Pressable
            style={styles.circle}
            onPress={() => router.push('/challenges/rewards')}
            accessibilityRole="button"
            accessibilityLabel="Rewards"
          >
            <Ionicons name="gift" size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.rewards}
            onPress={() => router.push('/challenges/rewards')}
            accessibilityRole="button"
          >
            <Ionicons name="gift" size={16} color={colors.primary} />
            <Text style={styles.rewardsText}>Rewards</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.circle}
          onPress={() => router.push('/family/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <Ionicons name="person" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <PetSwitcherSheet
        visible={pickerOpen}
        pets={pets}
        currentPetId={pet?.petId}
        onSelect={onSelectPet}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  petButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petName: { fontSize: 24, fontFamily: fonts.heading, color: colors.text },
  eyebrow: { fontSize: 13, color: colors.textMuted, marginBottom: -2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  rewardsText: { fontSize: 16, fontFamily: fonts.subheading, color: colors.primary },
});
