import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { colors } from '@/constants/theme';
import { sessionStore } from '@/lib/auth';
import { pendingInvitation } from '@/lib/pendingInvite';

export default function OnboardingLayout() {
  const session = sessionStore.useValue();
  const pathname = usePathname();
  const [inviteToken, setInviteToken] = useState<string | null | undefined>(undefined);
  const isPetSetup = ['/pet', '/invite-family', '/focus', '/pace', '/care-notes', '/plan'].includes(pathname);
  useEffect(() => {
    if (!isPetSetup || session !== 'onboarding') {
      setInviteToken(undefined);
      return;
    }
    let cancelled = false;
    void pendingInvitation().then(token => { if (!cancelled) setInviteToken(token); });
    return () => { cancelled = true; };
  }, [isPetSetup, session, pathname]);

  // Wait for Firebase's persisted sign-in and family membership lookup.
  if (session === 'loading') return null;

  // Existing pet members always land on Home, regardless of a previously
  // restored onboarding route.
  if (session === 'ready') return <Redirect href="/" />;

  if (isPetSetup && session === 'onboarding') {
    if (inviteToken === undefined) return null;
    if (inviteToken) return <Redirect href={{ pathname: '/invite/[invitationId]', params: { invitationId: inviteToken } }} />;
  }

  // Signed-out users must not resume a protected onboarding step after a
  // reload. Keep Welcome, Sign in and Create account available.
  const publicPaths = ['/welcome', '/sign-in', '/create-account'];
  if (session === 'signedOut' && !publicPaths.includes(pathname)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="pet" options={{ gestureEnabled: false }} />
      <Stack.Screen name="invite-family" options={{ gestureEnabled: false }} />
      <Stack.Screen name="focus" />
      <Stack.Screen name="pace" />
      <Stack.Screen name="care-notes" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
