import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/HomeHeader';
import { ProgressBar } from '@/components/home/ProgressBar';
import { SectionHeader } from '@/components/log/SectionHeader';
import { colors, fonts } from '@/constants/theme';
import { usePets } from '@/hooks/usePets';
import { fetchRewards, type RewardsPage } from '@/lib/challengesData';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { Reward } from '@/types/firestore';

type IconName = ComponentProps<typeof Ionicons>['name'];

// How each unlocked reward looks and what its button says. The rewards model has no
// display fields, so this lives in the UI, keyed by rewardId.
const DISPLAY: Record<
  string,
  { icon: IconName; bg: string; fg: string; action: string; href?: Href }
> = {
  reward001: { icon: 'pricetag-outline', bg: colors.peach, fg: '#C06A1F', action: 'Redeem' },
  reward002: {
    icon: 'images-outline',
    bg: colors.mint,
    fg: '#3F8A57',
    action: 'Create',
    href: '/memories/recap',
  },
  reward003: { icon: 'happy-outline', bg: colors.primarySoft, fg: colors.primary, action: 'Use' },
  reward004: { icon: 'print-outline', bg: colors.butter, fg: '#B07A00', action: 'Order' },
};
const DEFAULT_DISPLAY = {
  icon: 'gift-outline' as IconName,
  bg: colors.primarySoft,
  fg: colors.primary,
  action: 'View',
};

/** Reward descriptions can mention the pet as {pet}. */
const describe = (r: Reward, petName: string) => r.description.replaceAll('{pet}', petName);

export default function RewardsScreen() {
  const { pets, pet } = usePets();
  const dataVersion = dataVersionStore.useValue();
  const [page, setPage] = useState<RewardsPage | null>(null);
  const petId = pet?.petId;

  useEffect(() => {
    if (!petId) return;
    (async () => setPage(await fetchRewards(petId)))();
  }, [petId, dataVersion]);

  const next = page?.level?.nextLevelPoints ?? 0;
  const toGo = Math.max(0, next - (page?.pet.totalPoints ?? 0));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        eyebrow="Pet Points & Rewards"
        compact
      />
      {page && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, styles.progress]}>
            <View style={styles.progressTop}>
              <View style={styles.flex}>
                <Text style={styles.kicker}>
                  {page.pet.name.toUpperCase()}&apos;S SHARED PROGRESS
                </Text>
                <Text style={styles.level}>Level {page.pet.level}</Text>
                {page.level && <Text style={styles.levelTitle}>{page.level.title}</Text>}
              </View>
              <View style={styles.pointsCircle}>
                <Text style={styles.pointsValue}>{page.pet.totalPoints.toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>POINTS</Text>
              </View>
            </View>
            <Text style={styles.muted}>
              {page.nextLevel
                ? `${toGo.toLocaleString()} Points to Level ${page.nextLevel.levelNum} · ${page.nextLevel.title}`
                : 'Top level reached'}
            </Text>
            {next > 0 && <ProgressBar value={page.pet.totalPoints / next} />}
          </View>

          <View>
            <SectionHeader title="Unlocked rewards" hint={`${page.unlocked.length} available`} />
            <View style={styles.card}>
              {page.unlocked.length === 0 && (
                <Text style={[styles.muted, styles.empty]}>
                  Keep logging care to unlock your first reward.
                </Text>
              )}
              {page.unlocked.map((r, i) => {
                const d = DISPLAY[r.rewardId] ?? DEFAULT_DISPLAY;
                return (
                  <View
                    key={r.rewardId}
                    style={[styles.row, i < page.unlocked.length - 1 && styles.divider]}
                  >
                    <View style={[styles.icon, { backgroundColor: d.bg }]}>
                      <Ionicons name={d.icon} size={22} color={d.fg} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.rewardName}>{r.name}</Text>
                      <Text style={styles.muted}>{describe(r, page.pet.name)}</Text>
                    </View>
                    <Pressable
                      style={[styles.action, { backgroundColor: d.bg }]}
                      onPress={d.href ? () => router.push(d.href!) : undefined}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.actionText, { color: d.fg }]}>
                        {d.action.toUpperCase()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {page.upcoming.length > 0 && (
            <View>
              <SectionHeader title="Coming up" hint="Earned together" />
              <View style={styles.card}>
                {page.upcoming.map(({ reward, level }, i) => (
                  <View
                    key={reward.rewardId}
                    style={[styles.row, i < page.upcoming.length - 1 && styles.divider]}
                  >
                    <View style={[styles.icon, styles.lockedIcon]}>
                      <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.rewardName, styles.locked]}>{reward.name}</Text>
                      <Text style={styles.lockedText}>{describe(reward, page.pet.name)}</Text>
                    </View>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>LEVEL {level}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, gap: 24, paddingBottom: 40 },
  flex: { flex: 1, gap: 2 },
  muted: { fontSize: 13, color: colors.textMuted },
  empty: { paddingVertical: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  progress: { paddingVertical: 16, gap: 10 },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { fontSize: 12, fontFamily: fonts.heading, color: colors.textMuted, letterSpacing: 0.5 },
  level: { fontSize: 30, fontFamily: fonts.heading, color: colors.text },
  levelTitle: { fontSize: 16, color: colors.text },
  pointsCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: { fontSize: 24, fontFamily: fonts.heading, color: colors.primary },
  pointsLabel: { fontSize: 11, fontFamily: fonts.heading, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardName: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  action: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  actionText: { fontSize: 12, fontFamily: fonts.heading, letterSpacing: 0.5 },
  lockedIcon: { backgroundColor: colors.track },
  locked: { color: colors.textMuted },
  lockedText: { fontSize: 13, color: colors.textMuted, opacity: 0.8 },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.track,
  },
  levelBadgeText: { fontSize: 11, fontFamily: fonts.heading, color: colors.textMuted },
});
