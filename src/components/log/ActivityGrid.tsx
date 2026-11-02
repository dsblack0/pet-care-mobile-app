import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACTIVITY_ICONS } from '@/components/home/ActivityIcon';
import { activityTint, colors, fonts } from '@/constants/theme';

export const ACTIVITIES: { type: string; label: string }[] = [
  { type: 'Walk', label: 'Walk' },
  { type: 'Feed', label: 'Feed' },
  { type: 'Play', label: 'Play' },
  { type: 'Train', label: 'Training' },
  { type: 'Groom', label: 'Grooming' },
  { type: 'Medication', label: 'Medication' },
  { type: 'Other', label: 'Other' },
];

type Props = { selected: string | null; onSelect: (type: string) => void };

export function ActivityGrid({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {ACTIVITIES.map(({ type, label }) => {
        const active = type === selected;
        const tint = activityTint[type] ?? activityTint.Other;
        return (
          <Pressable
            key={type}
            onPress={() => onSelect(type)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.tile, active && { backgroundColor: tint.bg, borderColor: tint.fg }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: active ? colors.surface : tint.bg }]}>
              <Ionicons name={ACTIVITY_ICONS[type] ?? 'ellipse'} size={22} color={tint.fg} />
            </View>
            <Text style={[styles.label, active && { color: tint.fg }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: {
    width: '31.5%',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontFamily: fonts.subheading, color: colors.text },
});
