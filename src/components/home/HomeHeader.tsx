import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import type { Pet } from '@/types/firestore';

type Props = {
  pet: Pet | null;
  pets: Pet[];
  onSelectPet: (petId: string) => void;
  /** Shown before the pet name, e.g. the mini pet face. */
  leading?: ReactNode;
};

export function HomeHeader({ pet, pets, onSelectPet, leading }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.bar}>
      <Pressable
        style={styles.petButton}
        onPress={() => setPickerOpen(true)}
        disabled={pets.length < 2}
        accessibilityRole="button"
        accessibilityLabel="Switch pet"
      >
        {leading}
        <Text style={styles.petName}>{pet?.name ?? ''}</Text>
        {pets.length > 1 && <Ionicons name="chevron-down" size={20} color={colors.text} />}
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={styles.circle} accessibilityRole="button" accessibilityLabel="Help">
          <Ionicons name="help" size={20} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.rewards} accessibilityRole="button">
          <Ionicons name="gift" size={16} color={colors.primary} />
          <Text style={styles.rewardsText}>Rewards</Text>
        </Pressable>
        <Pressable style={styles.circle} accessibilityRole="button" accessibilityLabel="Profile">
          <Ionicons name="person" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            {pets.map((p) => (
              <Pressable
                key={p.petId}
                style={styles.sheetRow}
                onPress={() => {
                  setPickerOpen(false);
                  onSelectPet(p.petId);
                }}
              >
                <Text style={styles.sheetText}>{p.name}</Text>
                {p.petId === pet?.petId && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  petName: { fontSize: 24, fontFamily: fonts.heading, color: colors.text },
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 32,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 8 },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetText: { fontSize: 18, fontFamily: fonts.subheading, color: colors.text },
});
