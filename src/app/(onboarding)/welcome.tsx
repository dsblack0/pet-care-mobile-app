import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActivityIcon } from "@/components/home/ActivityIcon";
import { ProgressBar } from "@/components/home/ProgressBar";
import { PetFace } from "@/components/pet/PetFace";
import { colors, fonts } from "@/constants/theme";

const SLIDES = [
  {
    title: "Make memories.\nGrow together.",
    body: "Caring for your pet works better as a team.",
  },
  {
    title: "Share the care",
    body: "Everyone logs walks, meals and play in one place.",
  },
  {
    title: "Weekly challenges",
    body: "Small goals the whole family works on together.",
  },
  {
    title: "Keep the memories",
    body: "Photos and moments, saved as you go.",
  },
];

const SAMPLE_LOGS = [
  { activity: "Walk", title: "Walk · 25 min", by: "Mom" },
  { activity: "Feed", title: "Breakfast", by: "Sam" },
  { activity: "Play", title: "Fetch in the yard", by: "Jo" },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const hero = (i: number) => {
    switch (i) {
      case 0:
        return (
          <View style={styles.halo}>
            <PetFace
              species="Dog"
              mood="happy"
              size={170}
              scrollY={scrollY}
              atBottom={atBottom}
            />
          </View>
        );
      case 1:
        return (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Today</Text>
            {SAMPLE_LOGS.map((log) => (
              <View key={log.title} style={styles.logRow}>
                <ActivityIcon activityType={log.activity} />
                <View style={styles.flex}>
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logBy}>Logged by {log.by}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      case 2:
        return (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>This week</Text>
            <Text style={styles.challengeTitle}>Take Biscuit for 3 walks</Text>
            <ProgressBar value={2 / 3} />
            <Text style={styles.logBy}>2 of 3 done</Text>
          </View>
        );
      default:
        return (
          <View style={styles.photos}>
            <Image
              source={require("../../../assets/onboarding/doodle.jpg")}
              style={[styles.photo, styles.photoTall]}
              accessible
              accessibilityLabel="A fluffy doodle smiling up from the grass"
            />
            <View style={styles.photoColumn}>
              <Image
                source={require("../../../assets/onboarding/sleepy.jpg")}
                style={[styles.photo, styles.flex]}
                accessible
                accessibilityLabel="A small tan dog napping on a bed"
              />
              <Image
                source={require("../../../assets/onboarding/cat.jpg")}
                style={[styles.photo, styles.flex]}
                accessible
                accessibilityLabel="A tabby cat being held in a lap"
              />
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.brand}>
        <PetFace
          species="Dog"
          mood="happy"
          size={34}
          scrollY={scrollY}
          atBottom={atBottom}
          tappable={false}
        />
        <Text style={styles.brandText}>Pawmily</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.flex}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={styles.hero}>{hero(i)}</View>
            <View style={styles.text}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <Pressable
            key={slide.title}
            onPress={() => goTo(i)}
            style={styles.dotHit}
            accessibilityRole="button"
            accessibilityLabel={`Show slide ${i + 1} of ${SLIDES.length}`}
            accessibilityState={{ selected: i === index }}
          >
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.primary}
          onPress={() => router.push("/create-account")}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Get started</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => router.push("/sign-in")}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Log in</Text>
        </Pressable>
        <Text style={styles.invite}>
          Joining your family’s pet?{" "}
          <Text
            style={styles.inviteLink}
            onPress={() => router.push("/invite-code")}
            accessibilityRole="link"
          >
            Use an invite code
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 12,
  },
  brandText: { fontSize: 24, fontFamily: fonts.heading, color: colors.text },
  slide: { paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  halo: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    gap: 12,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.textMuted,
  },
  logRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  logBy: { fontSize: 13, color: colors.textMuted },
  challengeTitle: {
    fontSize: 17,
    fontFamily: fonts.subheading,
    color: colors.text,
  },
  photos: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 320,
    height: 312,
  },
  photoColumn: { flex: 1, gap: 12 },
  photo: { width: "100%", borderRadius: 20 },
  photoTall: { flex: 1, height: "100%" },
  text: { gap: 8, alignItems: "center", minHeight: 112 },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  dotHit: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9CFC3",
  },
  dotActive: { width: 22, backgroundColor: colors.primary },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 12 },
  primary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 18, fontFamily: fonts.heading, color: "#FFFFFF" },
  secondary: {
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  invite: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    paddingTop: 4,
  },
  inviteLink: { fontFamily: fonts.subheading, color: colors.primary },
});
