import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fieldStyles } from "@/components/form/fieldStyles";
import { colors, fonts } from "@/constants/theme";

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

/** A date field. Android shows the system dialog; iOS shows a spinner in a sheet. */
export function DateField({ label, value, onChange, maximumDate }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const openPicker = () => {
    setDraft(value ?? new Date());
    setOpen(true);
  };

  return (
    <>
      <Pressable
        style={fieldStyles.box}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={value ? fieldStyles.text : fieldStyles.placeholder}>
          {value
            ? value.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Select date"}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </Pressable>

      {open && Platform.OS === "android" && (
        <DateTimePicker
          value={draft}
          mode="date"
          maximumDate={maximumDate}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.backdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setOpen(false)}
            />
            <View style={styles.sheet}>
              <View style={styles.toolbar}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    onChange(draft);
                  }}
                >
                  <Text style={styles.done}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                onValueChange={(_, date) => setDraft(date)}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(42,33,28,0.35)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cancel: { fontSize: 16, color: colors.textMuted },
  done: { fontSize: 16, fontFamily: fonts.heading, color: colors.primary },
});
