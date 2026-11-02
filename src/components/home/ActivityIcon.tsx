import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { activityTint } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, IconName> = {
  Feed: 'silverware-fork-knife',
  Walk: 'paw',
  Medication: 'pill',
  Play: 'account-group-outline',
  Train: 'school-outline',
  Groom: 'content-cut',
  Photo: 'camera-outline',
};

export function ActivityIcon({ activityType }: { activityType: string }) {
  const tint = activityTint[activityType] ?? activityTint.Feed;
  return (
    <View style={[styles.tile, { backgroundColor: tint.bg }]}>
      <MaterialCommunityIcons name={ICONS[activityType] ?? 'circle-outline'} size={20} color={tint.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
