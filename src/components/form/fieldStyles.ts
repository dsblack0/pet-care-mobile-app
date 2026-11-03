import { StyleSheet } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: fonts.subheading, color: colors.text, marginBottom: 6 },
  box: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: { flex: 1, minWidth: 0, fontSize: 15, color: colors.text },
  /** For a TextInput that is the box itself. */
  inputText: { fontSize: 15, color: colors.text },
  placeholder: { flex: 1, fontSize: 15, color: colors.textMuted },
});
