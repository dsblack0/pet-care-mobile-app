import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

const PRESETS = [15, 30, 45];

type Props = {
  /** Selected preset in minutes, or 'custom'. */
  choice: number | 'custom';
  customMinutes: string;
  disabled: boolean;
  onChoose: (choice: number | 'custom') => void;
  onCustomChange: (text: string) => void;
};

export function DurationPicker({
  choice,
  customMinutes,
  disabled,
  onChoose,
  onCustomChange,
}: Props) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {PRESETS.map((m) => (
        <Chip key={m} label={`${m} min`} active={choice === m} onPress={() => onChoose(m)} />
      ))}
      {choice === 'custom' ? (
        <View style={[styles.chip, styles.chipActive, styles.customChip]}>
          <TextInput
            value={customMinutes}
            onChangeText={(t) => onCustomChange(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.6)"
            autoFocus
            maxLength={3}
            style={styles.customInput}
          />
          <Text style={[styles.chipText, styles.chipTextActive]}>min</Text>
        </View>
      ) : (
        <Chip label="Custom" active={false} onPress={() => onChoose('custom')} />
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  disabled: { opacity: 0.4, pointerEvents: 'none' },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontFamily: fonts.subheading, color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
  customChip: { flexDirection: 'row', gap: 4, paddingHorizontal: 14 },
  customInput: {
    minWidth: 28,
    padding: 0,
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: '#FFFFFF',
    textAlign: 'right',
  },
});
