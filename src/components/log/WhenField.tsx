import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/constants/theme";

type Props = { value: Date; onChange: (date: Date) => void };

export function WhenField({ value, onChange }: Props) {
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const dateLabel = value.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const timeLabel = value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const pick = (next: "date" | "time") => {
    setMode(next);
  };
  const changed = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setMode(null);
    if (event.type !== "set" || !selected) return;
    const next = new Date(value);
    if (mode === "date") next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    if (next.getTime() <= Date.now()) onChange(next);
  };
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable style={styles.field} onPress={() => pick("date")} accessibilityRole="button" accessibilityLabel="Choose activity date">
          <Ionicons name="calendar-outline" size={21} color={colors.primary} />
          <View style={styles.text}><Text style={styles.caption}>Date</Text><Text style={styles.value} numberOfLines={1}>{dateLabel}</Text></View>
        </Pressable>
        <Pressable style={styles.field} onPress={() => pick("time")} accessibilityRole="button" accessibilityLabel="Choose activity time">
          <Ionicons name="time-outline" size={21} color={colors.primary} />
          <View style={styles.text}><Text style={styles.caption}>Time</Text><Text style={styles.value}>{timeLabel}</Text></View>
        </Pressable>
      </View>
      {mode && (
        <View style={styles.picker}>
          {Platform.OS === "ios" && <Pressable style={styles.done} onPress={() => setMode(null)}><Text style={styles.doneText}>Done</Text></Pressable>}
          <DateTimePicker value={value} mode={mode} display={Platform.OS === "ios" ? "spinner" : "default"} maximumDate={mode === "date" ? new Date() : undefined} onChange={changed} />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { gap: 10 }, row: { flexDirection: "row", gap: 10 },
  field: { flex: 1, minWidth: 0, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  text: { flex: 1 }, caption: { fontSize: 12, color: colors.textMuted }, value: { fontSize: 13, fontFamily: fonts.subheading, color: colors.text },
  picker: { backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  done: { alignSelf: "flex-end", padding: 12 }, doneText: { color: colors.primary, fontFamily: fonts.subheading },
});
