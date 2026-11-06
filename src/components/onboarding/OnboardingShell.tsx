// Frame for every onboarding step: back button and progress on top, a title, scrolling content,
// and the main button pinned to the bottom.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/home/ProgressBar';
import { colors, fonts } from '@/constants/theme';

export const ONBOARDING_STEPS = 6;

type Props = {
  /** 1-based step for the progress bar; omit to hide it. */
  step?: number;
  /** Hide back once going back would redo a saved step. */
  canGoBack?: boolean;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** Omit when the content has its own submit button. */
  buttonLabel?: string;
  onPress?: () => void;
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  /** Optional line under the button, e.g. a link to sign in. */
  footer?: ReactNode;
  /** Optional element above the title, e.g. the pet's face. */
  hero?: ReactNode;
};

export function OnboardingShell({
  step,
  canGoBack = true,
  title,
  subtitle,
  children,
  buttonLabel,
  onPress,
  busy,
  disabled,
  error,
  footer,
  hero,
}: Props) {
  const inactive = busy || disabled;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        {canGoBack && router.canGoBack() ? (
          <Pressable
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        {step !== undefined && (
          <View style={styles.progress}>
            <ProgressBar value={step / ONBOARDING_STEPS} />
            <Text style={styles.stepText}>
              Step {step} of {ONBOARDING_STEPS}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {hero}
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </ScrollView>

        {(buttonLabel || footer || error) && (
          <View style={styles.footer}>
            {error && <Text style={styles.error}>{error}</Text>}
            {buttonLabel && (
              <Pressable
                style={[styles.button, inactive && styles.buttonDisabled]}
                onPress={onPress}
                disabled={inactive}
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>{busy ? 'One moment…' : buttonLabel}</Text>
              </Pressable>
            )}
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** A tappable text line for under the button. */
export function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export const onboardingStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  form: { gap: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 48,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flex: 1, gap: 6, paddingRight: 52 },
  stepText: { fontSize: 12, fontFamily: fonts.subheading, color: colors.textMuted },
  content: { padding: 20, paddingTop: 12, gap: 20, paddingBottom: 32 },
  heading: { gap: 8 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.heading, color: colors.text },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  error: { fontSize: 14, color: colors.openText, textAlign: 'center' },
  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },
  link: {
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.primary,
    textAlign: 'center',
  },
});
