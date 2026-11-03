import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { colors, fonts } from '@/constants/theme';
import { fetchLevels } from '@/lib/homeData';
import type { Level, Pet } from '@/types/firestore';

type Props = {
  visible: boolean;
  pets: Pet[];
  currentPetId: string | undefined;
  onSelect: (petId: string) => void;
  onClose: () => void;
};

export function PetSwitcherSheet({ visible, pets, currentPetId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    (async () => setLevels(await fetchLevels()))();
  }, []);

  const subtitle = (pet: Pet) => {
    const title = levels.find((l) => l.levelNum === pet.level)?.title;
    return [pet.species, `Level ${pet.level}`, title].filter(Boolean).join(' · ');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Switch pet</Text>
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.description}>
            Choose whose activity, care and memories you want to see.
          </Text>

          <View style={styles.list}>
            {pets.map((pet) => {
              const current = pet.petId === currentPetId;
              return (
                <Pressable
                  key={pet.petId}
                  style={[styles.row, current && styles.rowCurrent]}
                  onPress={() => {
                    onClose();
                    if (!current) onSelect(pet.petId);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: current }}
                >
                  <PetAvatar pet={pet} size={44} />
                  <View style={styles.rowText}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{pet.name}</Text>
                      {current && <Text style={styles.currentTag}>CURRENT</Text>}
                    </View>
                    <Text style={styles.sub}>{subtitle(pet)}</Text>
                  </View>
                  {current ? (
                    <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.row, styles.addRow]}
              onPress={() => {
                onClose();
                router.push('/family/add-pet');
              }}
              accessibilityRole="button"
            >
              <View style={styles.addIcon}>
                <Ionicons name="add" size={22} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>Add another pet</Text>
                <Text style={styles.sub}>Start a new pet profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(42,33,28,0.35)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  list: { gap: 10, marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowCurrent: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontFamily: fonts.heading, color: colors.text },
  currentTag: {
    fontSize: 11,
    fontFamily: fonts.heading,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sub: { fontSize: 13, color: colors.textMuted },
  addRow: { borderStyle: 'dashed' },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
