import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ActivityIcon } from '@/components/home/ActivityIcon';
import { colors } from '@/constants/theme';
import type { Challenge } from '@/types/firestore';

/** Together challenges get a people icon; others use their first activity's icon. */
export function ChallengeIcon({ challenge }: { challenge: Challenge }) {
  if (challenge.jointActivity) {
    return (
      <View style={styles.tile}>
        <Ionicons name="people" size={20} color={colors.primary} />
      </View>
    );
  }
  return <ActivityIcon activityType={challenge.activityTypes[0] ?? 'Other'} />;
}

const styles = StyleSheet.create({
  tile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
