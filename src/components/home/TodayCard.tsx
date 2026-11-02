import { StyleSheet, Text, View } from 'react-native';

import { ActivityIcon } from '@/components/home/ActivityIcon';
import { colors, fonts } from '@/constants/theme';
import { getCareRows, type CareStatus } from '@/lib/care';
import { activityLabel, formatShortDate } from '@/lib/format';
import type { CareSchedule, Memory, User } from '@/types/firestore';

const STATUS_STYLE: Record<CareStatus, { bg: string; fg: string }> = {
  Done: { bg: colors.doneBg, fg: colors.doneText },
  Open: { bg: colors.openBg, fg: colors.openText },
  Later: { bg: colors.laterBg, fg: colors.laterText },
};

type Props = {
  schedules: CareSchedule[];
  memories: Memory[];
  usersById: Record<string, User>;
};

export function TodayCard({ schedules, memories, usersById }: Props) {
  const now = new Date();
  const rows = getCareRows(schedules, memories, usersById, now);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Today</Text>
        <Text style={styles.date}>{formatShortDate(now)}</Text>
      </View>
      <View style={styles.card}>
        {rows.length === 0 && <Text style={styles.empty}>No care scheduled today.</Text>}
        {rows.map(({ schedule, status, subtitle }, i) => (
          <View key={schedule.id} style={[styles.row, i > 0 && styles.divider]}>
            <ActivityIcon activityType={schedule.activityType} />
            <View style={styles.rowText}>
              <Text style={styles.title}>{activityLabel(schedule.activityType)}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: STATUS_STYLE[status].bg }]}>
              <Text style={[styles.pillText, { color: STATUS_STYLE[status].fg }]}>{status}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heading: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
  date: { fontSize: 15, fontWeight: '600', color: colors.text },
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
  pill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  pillText: { fontSize: 14, fontWeight: '600' },
  empty: { paddingVertical: 16, color: colors.textMuted },
});
