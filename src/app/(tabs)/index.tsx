import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/HomeHeader';
import { HALO_SIZE, PetCard } from '@/components/home/PetCard';
import { RecentCard } from '@/components/home/RecentCard';
import { TodayCard } from '@/components/home/TodayCard';
import { WeeklyChallengeCard } from '@/components/home/WeeklyChallengeCard';
import { PetFace } from '@/components/pet/PetFace';
import { colors, fonts } from '@/constants/theme';
import { currentUserId } from '@/lib/auth';
import { useHomeData } from '@/hooks/useHomeData';
import { getCareRows, getMood, getPetLine } from '@/lib/care';

const BOTTOM_SLOP = 24;

export default function HomeScreen() {
  const { user, pets, pet, data, loading, error, selectPet } = useHomeData(currentUserId());

  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);
  const heroBottom = useSharedValue(400);

  // The scroll view remounts after a pet switch, so start the face from the top again.
  useEffect(() => {
    if (loading) {
      scrollY.set(0);
      atBottom.set(0);
    }
  }, [loading, scrollY, atBottom]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
    const distanceToEnd = e.contentSize.height - e.layoutMeasurement.height - e.contentOffset.y;
    atBottom.set(distanceToEnd < BOTTOM_SLOP ? 1 : 0);
  });

  // The small face in the header fades in once the big one scrolls out of view.
  const miniFaceStyle = useAnimatedStyle(() => {
    const t = interpolate(
      scrollY.get(),
      [heroBottom.get() - 80, heroBottom.get() - 20],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: t, width: 40 * t, overflow: 'hidden' };
  });

  const careRows = data ? getCareRows(data.schedules, data.memories, data.usersById) : [];
  const mood = getMood(careRows);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={selectPet}
        leading={
          pet && (
            <Animated.View style={miniFaceStyle}>
              <PetFace
                species={pet.species}
                mood={mood}
                size={40}
                scrollY={scrollY}
                atBottom={atBottom}
                tappable={false}
              />
            </Animated.View>
          )
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {user && <Text style={styles.greeting}>Hi {user.name}!</Text>}

          {pet && data && (
            <>
              {/* The header's mini face fades in once the big face scrolls out of view. */}
              <View onLayout={(e) => heroBottom.set(e.nativeEvent.layout.y + HALO_SIZE)}>
                <PetCard
                  pet={pet}
                  level={data.level}
                  mood={mood}
                  line={getPetLine(careRows)}
                  scrollY={scrollY}
                  atBottom={atBottom}
                />
              </View>
              {data.challenge && (
                <WeeklyChallengeCard challenge={data.challenge} usersById={data.usersById} />
              )}
              <TodayCard
                schedules={data.schedules}
                memories={data.memories}
                usersById={data.usersById}
              />
              <RecentCard petName={pet.name} memories={data.memories} usersById={data.usersById} />
            </>
          )}
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, gap: 26, paddingBottom: 40 },
  greeting: { fontSize: 18, fontFamily: fonts.subheading, color: colors.textMuted },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  error: { color: colors.openText, padding: 20, textAlign: 'center' },
});
