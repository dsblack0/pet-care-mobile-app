import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/HomeHeader';
import { ProgressBar } from '@/components/home/ProgressBar';
import { SectionHeader } from '@/components/log/SectionHeader';
import { currentUserId } from '@/lib/auth';
import { colors, fonts } from '@/constants/theme';
import type { CareStatus } from '@/lib/care';
import {
  fetchFamilyWeek,
  sendNudge,
  type CoverageRow,
  type FamilyWeek,
  type MemberWeek,
} from '@/lib/familyData';
import { initial } from '@/lib/format';
import { usePets } from '@/hooks/usePets';
import { dataVersionStore, selectedPetStore } from '@/lib/store';

type IconName = ComponentProps<typeof Ionicons>['name'];

// One color per family member, in list order.
const MEMBER_COLORS = [
  { bg: colors.primarySoft, fg: colors.primary },
  { bg: colors.peach, fg: '#C06A1F' },
  { bg: colors.mint, fg: '#3F8A57' },
  { bg: colors.butter, fg: '#B07A00' },
];

export default function FamilyScreen() {
  const [week, setWeek] = useState<FamilyWeek | null>(null);
  const [nudged, setNudged] = useState<string[]>([]);

  const dataVersion = dataVersionStore.useValue();
  const { pets, pet } = usePets();
  const petId = pet?.petId;

  useEffect(() => {
    if (!petId) return;
    (async () => setWeek(await fetchFamilyWeek(petId)))();
  }, [petId, dataVersion]);

  const selectPet = (id: string) => {
    selectedPetStore.set(id);
    setNudged([]);
  };

  const nudge = async (recipientId: string) => {
    if (!pet) return;
    try {
      await sendNudge(pet.petId, currentUserId(), recipientId, pet.name);
      setNudged((cur) => [...cur, recipientId]);
    } catch (e) { Alert.alert('Reminder not sent', e instanceof Error ? e.message : 'Please try again.'); }
  };

  // You first, then everyone else.
  const members = [...(week?.members ?? [])].sort((a, b) =>
    a.user.userId === currentUserId() ? -1 : b.user.userId === currentUserId() ? 1 : 0,
  );

  const meta = week
    ? [
        `${week.contributions} contribution${week.contributions === 1 ? '' : 's'}`,
        `${week.sharedActivities} shared ${week.sharedActivities === 1 ? 'activity' : 'activities'}`,
        week.goalProgress !== null
          ? `${Math.round(week.goalProgress * 100)}% of family goals`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader pet={pet} pets={pets} onSelectPet={selectPet} eyebrow="Family" compact />
      {pet && week && (
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <SectionHeader title={`${pet.name}'s Family`} />
            <View style={[styles.card, styles.summary]}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="people" size={24} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.summaryTitle}>A shared week with {pet.name}</Text>
                  <Text style={styles.muted}>
                    Everyone helped in a different way—care, play and memories all count.
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>{meta}</Text>
              {week.goalProgress !== null && <ProgressBar value={week.goalProgress} />}
              <View style={styles.stats}>
                <Stat value={week.walks} one="walk" many="walks" />
                <View style={styles.statDivider} />
                <Stat value={week.feeds} one="feed" many="feeds" />
                <View style={styles.statDivider} />
                <Stat value={week.photoMemories} one="memory" many="memories" />
              </View>
            </View>
          </View>

          <View>
            <SectionHeader
              title="Family members"
              hint={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}
            />
            <View style={styles.card}>
              {members.map((m, i) => (
                <MemberRow
                  key={m.user.userId}
                  member={m}
                  color={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                  isYou={m.user.userId === currentUserId()}
                  nudged={nudged.includes(m.user.userId)}
                  onNudge={() => nudge(m.user.userId)}
                  last={i === members.length - 1}
                />
              ))}
            </View>
          </View>

          <Pressable
            style={styles.button}
            onPress={() => router.push('/family/invite')}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>Invite to Family</Text>
          </Pressable>

          <View>
            <View style={styles.sectionRow}>
              <SectionHeader title="Today's coverage" />
              <Text style={styles.link}>Collaborative view</Text>
            </View>
            <View style={styles.card}>
              {week.coverage.length === 0 && (
                <Text style={[styles.muted, styles.empty]}>No care scheduled today.</Text>
              )}
              {week.coverage.map((row, i) => (
                <CoverageItem
                  key={row.schedule.careScheduleId}
                  row={row}
                  last={i === week.coverage.length - 1}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ value, one, many }: { value: number; one: string; many: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value} {value === 1 ? one : many}
      </Text>
      <Text style={styles.statLabel}>this week</Text>
    </View>
  );
}

function MemberRow({
  member,
  color,
  isYou,
  nudged,
  onNudge,
  last,
}: {
  member: MemberWeek;
  color: { bg: string; fg: string };
  isYou: boolean;
  nudged: boolean;
  onNudge: () => void;
  last: boolean;
}) {
  return (
    <View style={[styles.memberRow, !last && styles.divider]}>
      <View style={[styles.avatar, { backgroundColor: color.bg }]}>
        <Text style={[styles.avatarText, { color: color.fg }]}>{initial(member.user.name)}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.memberName}>{isYou ? 'You' : member.user.name}</Text>
        <Text style={styles.memberLine}>
          {member.usuallyHelpsWith
            ? `Usually helps with: ${member.usuallyHelpsWith}`
            : "Hasn't logged anything yet"}
        </Text>
        <Text style={styles.memberSub}>{member.thisWeek ?? 'Nothing this week'} this week</Text>
      </View>
      <View style={[styles.acts, { backgroundColor: color.bg }]}>
        <Text style={[styles.actsValue, { color: color.fg }]}>{member.acts}</Text>
        <Text style={[styles.actsLabel, { color: color.fg }]}>
          {member.acts === 1 ? 'act' : 'acts'}
        </Text>
      </View>
      <Pressable
        style={[styles.nudge, (isYou || nudged) && styles.nudgeDisabled]}
        onPress={onNudge}
        disabled={isYou || nudged}
        accessibilityRole="button"
        accessibilityLabel={`Nudge ${member.user.name}`}
      >
        <Ionicons
          name={nudged ? 'checkmark' : 'notifications-outline'}
          size={18}
          color={colors.primary}
        />
        <Text style={styles.nudgeText}>{nudged ? 'Sent' : 'Nudge'}</Text>
      </Pressable>
    </View>
  );
}

const PART_ICON: Record<string, IconName> = {
  Morning: 'partly-sunny-outline',
  Afternoon: 'sunny-outline',
  Evening: 'moon-outline',
};

const COVERAGE_STYLE: Record<CareStatus, { bg: string; fg: string }> = {
  Done: { bg: colors.doneBg, fg: colors.doneText },
  Open: { bg: colors.openBg, fg: colors.openText },
  Later: { bg: colors.track, fg: colors.textMuted },
};

function CoverageItem({ row, last }: { row: CoverageRow; last: boolean }) {
  const icon = PART_ICON[row.label.split(' ')[0]] ?? 'time-outline';
  const pill =
    row.status === 'Done'
      ? `${row.doneBy} · done`
      : row.status === 'Open'
        ? 'Still needed'
        : 'Unclaimed';
  const style = COVERAGE_STYLE[row.status];
  return (
    <View style={[styles.coverageRow, !last && styles.divider]}>
      <Ionicons name={icon} size={22} color={colors.text} />
      <Text style={styles.coverageLabel}>{row.label}</Text>
      <Text style={[styles.pill, { backgroundColor: style.bg, color: style.fg }]}>{pill}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 12, gap: 24, paddingBottom: 40 },
  flex: { flex: 1 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  muted: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { fontSize: 14, fontFamily: fonts.subheading, color: colors.primary, marginTop: 4 },
  empty: { paddingVertical: 16 },

  summary: { paddingVertical: 16, gap: 12 },
  summaryTop: { flexDirection: 'row', gap: 14 },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { fontSize: 19, fontFamily: fonts.heading, color: colors.text, marginBottom: 2 },
  meta: { fontSize: 13, color: colors.textMuted },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: fonts.heading },
  memberName: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  memberLine: { fontSize: 13, color: colors.text },
  memberSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  acts: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  actsValue: { fontSize: 17, fontFamily: fonts.heading, lineHeight: 19 },
  actsLabel: { fontSize: 10 },
  nudge: {
    width: 52,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeDisabled: { opacity: 0.4 },
  nudgeText: { fontSize: 10, fontFamily: fonts.subheading, color: colors.primary },

  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },

  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  coverageLabel: { flex: 1, fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  pill: {
    fontSize: 13,
    fontFamily: fonts.subheading,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
