import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "@/constants/theme";
const PRESETS = [15, 30, 45];
type Props = { choice: number | "custom" | null; customMinutes: string; onChoose: (choice: number | "custom" | null) => void; onCustomChange: (text: string) => void };
export function DurationPicker({ choice, customMinutes, onChoose, onCustomChange }: Props) {
  return <View style={styles.row}>
    {[...PRESETS, null].map((m) => <Pressable key={m ?? "none"} style={[styles.chip, choice === m && styles.active]} onPress={() => onChoose(m)}><Text style={[styles.label, choice === m && styles.activeText]}>{m === null ? "None" : `${m} min`}</Text></Pressable>)}
    {choice === "custom" ? <View style={[styles.chip, styles.active, styles.custom]}><TextInput value={customMinutes} onChangeText={(t) => onCustomChange(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="Minutes" placeholderTextColor="#FFFFFFAA" style={[styles.label, styles.activeText, { minWidth: 60 }]} maxLength={4} /><Text style={styles.activeText}>min</Text></View> : <Pressable style={styles.chip} onPress={() => onChoose("custom")}><Text style={styles.label}>Custom</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, active: { backgroundColor: colors.primary, borderColor: colors.primary }, label: { fontSize: 14, fontFamily: fonts.subheading, color: colors.text }, activeText: { color: "#FFFFFF" }, custom: { flexDirection: "row", gap: 4 } });
