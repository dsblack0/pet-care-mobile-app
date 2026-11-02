import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { ProgressBar } from '@/components/home/ProgressBar';
import { getFaceSpec } from '@/components/pet/faceSpecs';
import { PetFace } from '@/components/pet/PetFace';
import { colors, fonts } from '@/constants/theme';
import type { PetMood } from '@/lib/care';
import type { Level, Pet } from '@/types/firestore';

const FACE_SIZE = 170;
export const HALO_SIZE = 210;

type Props = {
  pet: Pet;
  level: Level | null;
  mood: PetMood;
  /** What the pet "says" under its face. */
  line: string;
  scrollY: SharedValue<number>;
  atBottom: SharedValue<number>;
};

// The pet hero: face on a soft halo, a speech bubble, then name and level.
export function PetCard({ pet, level, mood, line, scrollY, atBottom }: Props) {
  const nextLevelPoints = level ? Number(level.nextLevelPoints) : 0;
  const { halo } = getFaceSpec(pet.species);

  return (
    <View style={styles.hero}>
      <View style={[styles.halo, { backgroundColor: halo }]}>
        <PetFace
          species={pet.species}
          mood={mood}
          size={FACE_SIZE}
          scrollY={scrollY}
          atBottom={atBottom}
        />
      </View>

      <View style={styles.bubble}>
        <View style={styles.bubbleTail} />
        <Text style={styles.bubbleText}>{line}</Text>
      </View>

      <Text style={styles.name}>{pet.name}</Text>
      <Text style={styles.level}>
        Level {pet.level}
        {level ? ` · ${level.title}` : ''}
      </Text>
      {nextLevelPoints > 0 && (
        <View style={styles.progress}>
          <ProgressBar value={pet.totalPoints / nextLevelPoints} />
          <Text style={styles.points}>
            {pet.totalPoints.toLocaleString()} / {nextLevelPoints.toLocaleString()} Points
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    marginTop: 14,
    marginBottom: 14,
    maxWidth: 300,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleTail: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    width: 12,
    height: 12,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text, textAlign: 'center' },
  name: { fontSize: 34, fontFamily: fonts.heading, color: colors.text },
  level: { fontSize: 16, color: colors.textMuted },
  progress: { alignSelf: 'stretch', gap: 6, marginTop: 12, paddingHorizontal: 24 },
  points: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
