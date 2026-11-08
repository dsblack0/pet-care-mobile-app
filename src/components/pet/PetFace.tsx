import { useEffect } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { getFaceSpec } from "@/components/pet/faceSpecs";
import type { PetMood } from "@/lib/care";

type Props = {
  species: string;
  mood: PetMood;
  size: number;
  /** Vertical scroll offset of the screen. Negative while pulling down past the top. */
  scrollY: SharedValue<number>;
  /** 1 while the screen is scrolled to the bottom, else 0. */
  atBottom: SharedValue<number>;
  /** Tap to boop. Off for the small header face. */
  tappable?: boolean;
};

const LINE = "#3B2B2B";
const PULL_DISTANCE = 90;

/** A 0..1 "open" value animated to closed and back. */
function blinkTo(slow: boolean, hold = 0) {
  "worklet";
  const close = withTiming(0.08, { duration: slow ? 350 : 70 });
  const open = withTiming(1, { duration: slow ? 450 : 110 });
  return withSequence(close, withDelay(hold, open));
}

export function PetFace({
  species,
  mood,
  size,
  scrollY,
  atBottom,
  tappable = true,
}: Props) {
  const spec = getFaceSpec(species);
  const u = size / 100;
  const line = Math.max(1, 1.3 * u);
  const reduceMotion = useReducedMotion();

  const leftEye = useSharedValue(1);
  const rightEye = useSharedValue(1);
  const boop = useSharedValue(0);
  const waiting = useSharedValue(mood === "waiting" ? 1 : 0);

  const slowBlink = spec.pupil === "slit" && mood === "happy"; // a cat's "I trust you" blink

  // Idle blinking at random intervals.
  useEffect(() => {
    if (reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(
        () => {
          leftEye.set(blinkTo(slowBlink, slowBlink ? 250 : 0));
          rightEye.set(blinkTo(slowBlink, slowBlink ? 250 : 0));
          loop();
        },
        2200 + Math.random() * 2800,
      );
    };
    loop();
    return () => clearTimeout(timer);
  }, [leftEye, rightEye, slowBlink, reduceMotion]);

  // Mood: waiting pets get puppy eyes and a head tilt.
  useEffect(() => {
    waiting.set(withTiming(mood === "waiting" ? 1 : 0, { duration: 400 }));
  }, [mood, waiting]);

  // Wink when the user reaches the bottom of the screen.
  useAnimatedReaction(
    () => atBottom.get(),
    (current, previous) => {
      if (!reduceMotion && current === 1 && previous === 0) {
        rightEye.set(blinkTo(false, 450));
      }
    },
  );

  const handlePress = () => {
    boop.set(
      withSequence(
        withTiming(1, { duration: 180 }),
        withDelay(700, withTiming(0, { duration: 300 })),
      ),
    );
    if (!reduceMotion) rightEye.set(blinkTo(false, 350));
  };

  // 0..1 excitement from pulling down past the top, or from a tap.
  const excitement = () => {
    "worklet";
    const pull = interpolate(
      scrollY.get(),
      [-PULL_DISTANCE, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return Math.max(pull, boop.get());
  };

  const faceStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-8 * waiting.get()}deg` },
      { scale: 1 + 0.06 * excitement() },
    ],
  }));

  const leftEarStyle = useAnimatedStyle(() => {
    const e = excitement();
    if (spec.earStyle === "floppy")
      return { transform: [{ rotate: `${14 + 26 * e}deg` }] };
    if (spec.earStyle === "pointed")
      return { transform: [{ translateY: -4 * u * e }, { rotate: "45deg" }] };
    return { transform: [{ translateY: -3 * u * e }] };
  });

  const rightEarStyle = useAnimatedStyle(() => {
    const e = excitement();
    if (spec.earStyle === "floppy")
      return { transform: [{ rotate: `${-14 - 26 * e}deg` }] };
    if (spec.earStyle === "pointed")
      return { transform: [{ translateY: -4 * u * e }, { rotate: "45deg" }] };
    return { transform: [{ translateY: -3 * u * e }] };
  });

  const eyeStyle = (eye: SharedValue<number>) => () => {
    "worklet";
    const grow = 1 + 0.15 * waiting.get();
    return { transform: [{ scaleX: grow }, { scaleY: eye.get() * grow }] };
  };
  const leftEyeStyle = useAnimatedStyle(eyeStyle(leftEye));
  const rightEyeStyle = useAnimatedStyle(eyeStyle(rightEye));

  // Eyes look up while pulling down and follow the content as it scrolls.
  const pupilStyle = useAnimatedStyle(() => {
    const look = {
      transform: [
        {
          translateY: interpolate(
            scrollY.get(),
            [-PULL_DISTANCE, 0, 300],
            [-2 * u, 0, 2.5 * u],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
    // Only slit pupils animate width. Returning width: undefined for round eyes
    // collapses them to zero width on iOS/Android.
    return spec.pupil === "slit"
      ? { ...look, width: (3.2 + 4 * waiting.get()) * u }
      : look;
  });

  const browStyle = (dir: 1 | -1) => () => {
    "worklet";
    return {
      opacity: waiting.get(),
      transform: [{ rotate: `${dir * 20 * waiting.get()}deg` }],
    };
  };
  const leftBrowStyle = useAnimatedStyle(browStyle(-1));
  const rightBrowStyle = useAnimatedStyle(browStyle(1));

  const box = (
    left: number,
    top: number,
    width: number,
    height: number,
  ): ViewStyle => ({
    position: "absolute",
    left: left * u,
    top: top * u,
    width: width * u,
    height: height * u,
  });

  const cat = spec.muzzleStyle === "pads";
  const eyeW = spec.pupil === "slit" ? 15 : 11;
  const eyeH = spec.pupil === "slit" ? 13 : 12;

  const ear = (side: "left" | "right") => {
    const style = side === "left" ? leftEarStyle : rightEarStyle;
    if (spec.earStyle === "floppy") {
      return (
        <Animated.View
          style={[
            box(side === "left" ? 8 : 70, 16, 22, 42),
            {
              backgroundColor: spec.ear,
              borderRadius: 11 * u,
              transformOrigin: "top",
            },
            style,
          ]}
        />
      );
    }
    if (spec.earStyle === "pointed") {
      return (
        <Animated.View
          style={[
            box(side === "left" ? 16 : 54, 12, 30, 30),
            { backgroundColor: spec.ear, borderRadius: 4 * u },
            style,
          ]}
        >
          <View
            style={[
              box(7, 7, 16, 16),
              { backgroundColor: spec.earInner, borderRadius: 3 * u },
            ]}
          />
        </Animated.View>
      );
    }
    return (
      <Animated.View
        style={[
          box(side === "left" ? 12 : 62, 12, 26, 26),
          { backgroundColor: spec.ear, borderRadius: 13 * u },
          style,
        ]}
      >
        <View
          style={[
            box(6, 6, 14, 14),
            { backgroundColor: spec.earInner, borderRadius: 7 * u },
          ]}
        />
      </Animated.View>
    );
  };

  const eye = (cx: number, style: typeof leftEyeStyle) => (
    <Animated.View
      style={[
        box(cx - eyeW / 2, 46 - eyeH / 2, eyeW, eyeH),
        {
          borderRadius: (eyeW / 2) * u,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: spec.pupil === "slit" ? spec.eye : "transparent",
        },
        style,
      ]}
    >
      {spec.pupil === "slit" ? (
        <Animated.View
          style={[
            { height: 10 * u, borderRadius: 2 * u, backgroundColor: LINE },
            pupilStyle,
          ]}
        />
      ) : (
        <Animated.View
          style={[
            {
              width: eyeW * u,
              height: eyeH * u,
              borderRadius: (eyeW / 2) * u,
              backgroundColor: spec.eye,
            },
            pupilStyle,
          ]}
        >
          <View
            style={[
              box(eyeW - 6, 2, 3.5, 3.5),
              { backgroundColor: "#FFFFFF", borderRadius: 2 * u },
            ]}
          />
        </Animated.View>
      )}
    </Animated.View>
  );

  const mouthArc = (left: number, width: number, top: number) => (
    <View
      style={[
        box(left, top, width, width * 0.65),
        {
          borderWidth: line,
          borderColor: "transparent",
          borderBottomColor: LINE,
          borderRadius: (width / 2) * u,
        },
      ]}
    />
  );

  const behindHead = spec.earStyle !== "floppy";

  const face = (
    <Animated.View style={[{ width: size, height: size }, faceStyle]}>
      {behindHead && ear("left")}
      {behindHead && ear("right")}

      {/* Head */}
      <View
        style={[
          box(14, cat ? 20 : 16, 72, cat ? 66 : 70),
          { backgroundColor: spec.fur, borderRadius: 34 * u },
        ]}
      />

      {!behindHead && ear("left")}
      {!behindHead && ear("right")}

      {/* Worried brows, only visible while waiting */}
      <Animated.View
        style={[
          box(31, 35, 10, 2.4),
          { backgroundColor: spec.brow, borderRadius: u },
          leftBrowStyle,
        ]}
      />
      <Animated.View
        style={[
          box(59, 35, 10, 2.4),
          { backgroundColor: spec.brow, borderRadius: u },
          rightBrowStyle,
        ]}
      />

      {eye(36, leftEyeStyle)}
      {eye(64, rightEyeStyle)}

      {cat ? (
        <>
          <View
            style={[
              box(38, 57, 12, 11),
              { backgroundColor: spec.muzzle, borderRadius: 6 * u },
            ]}
          />
          <View
            style={[
              box(50, 57, 12, 11),
              { backgroundColor: spec.muzzle, borderRadius: 6 * u },
            ]}
          />
          {spec.whiskers && (
            <>
              <View
                style={[
                  box(18, 60, 18, 0.7),
                  styles.whisker,
                  { transform: [{ rotate: "8deg" }] },
                ]}
              />
              <View
                style={[
                  box(18, 65, 18, 0.7),
                  styles.whisker,
                  { transform: [{ rotate: "-6deg" }] },
                ]}
              />
              <View
                style={[
                  box(64, 60, 18, 0.7),
                  styles.whisker,
                  { transform: [{ rotate: "-8deg" }] },
                ]}
              />
              <View
                style={[
                  box(64, 65, 18, 0.7),
                  styles.whisker,
                  { transform: [{ rotate: "6deg" }] },
                ]}
              />
            </>
          )}
          {mouthArc(44, 6, 59.5)}
          {mouthArc(50, 6, 59.5)}
          <View
            style={[
              box(46, 54, 8, 5.5),
              { backgroundColor: spec.nose, borderRadius: 3 * u },
            ]}
          />
        </>
      ) : (
        <>
          <View
            style={[
              box(31, 50, 38, 28),
              { backgroundColor: spec.muzzle, borderRadius: 14 * u },
            ]}
          />
          {mouthArc(42, 8, 60)}
          {mouthArc(50, 8, 60)}
          <View
            style={[
              box(43, 53, 14, 9),
              { backgroundColor: spec.nose, borderRadius: 5 * u },
            ]}
          />
        </>
      )}
    </Animated.View>
  );

  if (!tappable) return face;
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Boop"
    >
      {face}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  whisker: { backgroundColor: "#6E655D", minHeight: 1 },
});
