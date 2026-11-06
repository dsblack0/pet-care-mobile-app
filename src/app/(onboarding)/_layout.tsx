import { Redirect, Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { sessionStore } from '@/lib/auth';

export default function OnboardingLayout() {
  // Signed in and set up: go to the app.
  if (sessionStore.useValue() === 'ready') return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
      {/* The account and pet exist by now, so swiping back past here is off. */}
      <Stack.Screen name="pet" options={{ gestureEnabled: false }} />
      <Stack.Screen name="invite-family" options={{ gestureEnabled: false }} />
      <Stack.Screen name="focus" />
      <Stack.Screen name="pace" />
      <Stack.Screen name="care-notes" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
