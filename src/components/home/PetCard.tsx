import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { ProgressBar } from '@/components/home/ProgressBar';
import { PetFace } from '@/components/pet/PetFace';
import { colors } from '@/constants/theme';
import type { PetMood } from '@/lib/care';
import type { Level, Pet } from '@/types/firestore';

type Props = {
  pet: Pet;
  level: Level | null;
  mood: PetMood;
  scrollY: SharedValue<number>;
  atBottom: SharedValue<number>;
};

export function PetCard({ pet, level, mood, scrollY, atBottom }: Props) {
  const nextLevelPoints = level ? Number(level.nextLevelPoints) : 0;

  return (
    <View style={styles.card}>
      <PetFace species={pet.species} mood={mood} size={170} scrollY={scrollY} atBottom={atBottom} />
      <Text style={styles.name}>{pet.name}</Text>
      <Text style={styles.level}>
        Level {pet.level}
        {level ? ` · ${level.title}` : ''}
      </Text>
      {nextLevelPoints > 0 && (
        <View style={styles.progress}>
          <Text style={styles.points}>
            {pet.totalPoints.toLocaleString()} / {nextLevelPoints.toLocaleString()} Points
          </Text>
          <ProgressBar value={pet.totalPoints / nextLevelPoints} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 4,
    padding: 20,
    paddingTop: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 32, fontWeight: '700', color: colors.text },
  level: { fontSize: 17, color: colors.textMuted },
  progress: { alignSelf: 'stretch', gap: 6, marginTop: 10 },
  points: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
