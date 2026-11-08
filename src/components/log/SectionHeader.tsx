import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";

export function SectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  title: { fontSize: 20, fontFamily: fonts.heading, color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted },
});
