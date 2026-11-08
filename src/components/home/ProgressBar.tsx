import { StyleSheet, View } from "react-native";

import { colors } from "@/constants/theme";

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.track,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
});
