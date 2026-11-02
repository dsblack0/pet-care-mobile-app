import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { MemoryThumb } from '@/components/home/MemoryThumb';
import { colors, fonts } from '@/constants/theme';
import { toDate } from '@/lib/homeData';
import { activityLabel, formatRelativeDay } from '@/lib/format';
import type { Memory, User } from '@/types/firestore';

const MAX_ITEMS = 3;

function subtitleFor(m: Memory, usersById: Record<string, User>): string {
  const name = (id: string) => usersById[id]?.name ?? 'Someone';

  if (m.activityType === 'Photo') return `${name(m.createdBy)} added a photo`;

  if (m.participants.length > 1) {
    const parts = [m.participants.map(name).join(' + ')];
    if (m.bonusPoints > 0) parts.push(`+${m.bonusPoints} Together Bonus`);
    return parts.join(' · ');
  }

  const parts = [name(m.createdBy)];
  if (m.durationMinutes) parts.push(`${m.durationMinutes} min`);
  if (m.basePoints > 0) parts.push(`+${m.basePoints} Pts`);
  return parts.join(' · ');
}

type Props = { petName: string; memories: Memory[]; usersById: Record<string, User> };

export function RecentCard({ petName, memories, usersById }: Props) {
  const items = memories.slice(0, MAX_ITEMS);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Recent with {petName}</Text>
        <Link href="/memories" style={styles.seeAll}>
          See all
        </Link>
      </View>
      <View style={styles.card}>
        {items.length === 0 && <Text style={styles.empty}>No memories yet.</Text>}
        {items.map((m, i) => (
          <View key={m.memoryId} style={[styles.row, i > 0 && styles.divider]}>
            <MemoryThumb memory={m} />
            <View style={styles.rowText}>
              <Text style={styles.title}>{m.description || activityLabel(m.activityType)}</Text>
              <Text style={styles.subtitle}>{subtitleFor(m, usersById)}</Text>
            </View>
            <Text style={styles.when}>{formatRelativeDay(toDate(m.occurredAt))}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
  seeAll: { fontSize: 15, color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  when: { fontSize: 14, color: colors.textMuted },
  empty: { paddingVertical: 16, color: colors.textMuted },
});
