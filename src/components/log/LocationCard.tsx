import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { getCurrentPlace, type Place } from '@/lib/location';

type Props = {
  place: Place | null;
  onChange: (place: Place | null) => void;
};

/** Optional "where" for a logged activity, from the device's current location. */
export function LocationCard({ place, onChange }: Props) {
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCurrent = async () => {
    setFinding(true);
    setError(null);
    try {
      onChange(await getCurrentPlace());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFinding(false);
    }
  };

  return (
    <View style={styles.card}>
      {place ? (
        <View style={styles.row}>
          <View style={[styles.icon, styles.iconSet]}>
            <Ionicons name="location" size={20} color={colors.openText} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label} numberOfLines={1}>
              {place.label}
            </Text>
            <Text style={styles.hint}>Current location</Text>
          </View>
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remove location"
          >
            <Ionicons name="close-circle" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.row}
          onPress={addCurrent}
          disabled={finding}
          accessibilityRole="button"
        >
          <View style={styles.icon}>
            {finding ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.action}>{finding ? 'Finding you…' : 'Add current location'}</Text>
            <Text style={styles.hint}>Remember where it happened</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSet: { backgroundColor: colors.openBg },
  action: { fontSize: 16, fontFamily: fonts.subheading, color: colors.primary },
  label: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  error: { fontSize: 13, color: colors.openText },
});
