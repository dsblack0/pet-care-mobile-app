import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { activityTint } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const ACTIVITY_ICONS: Record<string, IconName> = {
  Feed: 'restaurant',
  Walk: 'paw',
  Medication: 'medkit',
  Play: 'tennisball',
  Train: 'school',
  Groom: 'cut',
  Photo: 'camera',
  Other: 'ellipsis-horizontal',
};

export function ActivityIcon({ activityType }: { activityType: string }) {
  const tint = activityTint[activityType] ?? activityTint.Feed;
  return (
    <View style={[styles.tile, { backgroundColor: tint.bg }]}>
      <Ionicons name={ACTIVITY_ICONS[activityType] ?? 'ellipse'} size={20} color={tint.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
