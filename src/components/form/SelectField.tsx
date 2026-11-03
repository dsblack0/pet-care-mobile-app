import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { fieldStyles } from '@/components/form/fieldStyles';
import { colors, fonts } from '@/constants/theme';

type Props<T extends string> = {
  label: string;
  placeholder: string;
  value: T | null;
  options: readonly T[];
  onChange: (value: T) => void;
};

/** A field that opens a list of options. */
export function SelectField<T extends string>({
  label,
  placeholder,
  value,
  options,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        style={fieldStyles.box}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={value ? fieldStyles.text : fieldStyles.placeholder}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{label.replace(' *', '')}</Text>
            {options.map((o) => (
              <Pressable
                key={o}
                style={styles.option}
                onPress={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{o}</Text>
                {o === value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,33,28,0.35)',
    justifyContent: 'center',
    padding: 32,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 10 },
  title: {
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
