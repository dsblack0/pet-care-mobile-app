import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";
import { initial } from "@/lib/format";

/** Overlapping initials, e.g. for who has contributed to a challenge. */
export function AvatarStack({
  names,
  size = 28,
}: {
  names: string[];
  size?: number;
}) {
  return (
    <View style={styles.row}>
      {names.map((name, i) => (
        <View
          key={`${name}-${i}`}
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 },
            i > 0 && { marginLeft: -size / 4 },
          ]}
        >
          <Text style={[styles.text, { fontSize: size * 0.42 }]}>
            {initial(name)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  avatar: {
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: fonts.heading, color: colors.text },
});
