import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { fieldStyles } from '@/components/form/fieldStyles';
import { colors } from '@/constants/theme';

/** Label + text box in the app's form style. */
export function TextField({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[fieldStyles.box, fieldStyles.inputText]}
        {...input}
      />
    </View>
  );
}
