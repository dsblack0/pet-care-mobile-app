import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { formatTime } from '@/lib/format';

/** Minutes before now. 0 = now. */
const OFFSETS = [0, 15, 30, 60, 120, 180];

function offsetLabel(minutes: number): string {
  if (minutes === 0) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = minutes / 60;
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

type Props = { minutesAgo: number; onChange: (minutesAgo: number) => void };

export function WhenField({ minutesAgo, onChange }: Props) {
  const [open, setOpen] = useState(false);
  // Clock time of the chosen option, captured when it's picked.
  const [pickedAt, setPickedAt] = useState<Date | null>(null);

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.value}>
          {minutesAgo === 0 || !pickedAt
            ? offsetLabel(minutesAgo)
            : `${offsetLabel(minutesAgo)} · ${formatTime(pickedAt)}`}
        </Text>
        <Ionicons name="time-outline" size={22} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>When did it happen?</Text>
            {OFFSETS.map((m) => (
              <Pressable
                key={m}
                style={styles.option}
                onPress={() => {
                  onChange(m);
                  setPickedAt(new Date(Date.now() - m * 60_000));
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{offsetLabel(m)}</Text>
                {m === minutesAgo && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 32,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 10 },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionText: { fontSize: 17, color: colors.text },
});
