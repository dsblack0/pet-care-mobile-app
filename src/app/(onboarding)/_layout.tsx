import { Redirect, Stack, usePathname } from "expo-router";
import { useEffect, useState } from "react";

import { colors } from "@/constants/theme";
import { sessionStore } from "@/lib/auth";
import { pendingInvitation } from "@/lib/pendingInvite";

export default function OnboardingLayout() {
  const session = sessionStore.useValue();
  const pathname = usePathname();
  const isPetSetup = [
    "/start",
    "/pet",
    "/invite-family",
    "/focus",
    "/pace",
    "/care-notes",
    "/plan",
  ].includes(pathname);
  const checkInvite = isPetSetup && session === "onboarding";
  // The saved invite as last read, with the path it was read for. Only the
  // async callback sets it; a result for another path is ignored below.
  const [inviteCheck, setInviteCheck] = useState<{
    path: string;
    token: string | null;
  } | null>(null);
  useEffect(() => {
    if (!checkInvite) return;
    let cancelled = false;
    void pendingInvitation().then((token) => {
      if (!cancelled) setInviteCheck({ path: pathname, token });
    });
    return () => {
      cancelled = true;
    };
  }, [checkInvite, pathname]);
  const inviteToken =
    checkInvite && inviteCheck?.path === pathname ? inviteCheck.token : null;

  // Wait for Firebase's persisted sign-in and family membership lookup.
  if (session === "loading") return null;

  // Existing pet members always land on Home, regardless of a previously
  // restored onboarding route.
  if (session === "ready") return <Redirect href="/" />;

  if (isPetSetup && session === "onboarding") {
    // Keep the stack mounted while the invite check runs. Rendering nothing here
    // drops the navigator, and the app falls back to the tabs.
    if (inviteToken)
      return (
        <Redirect
          href={{
            pathname: "/invite/[invitationId]",
            params: { invitationId: inviteToken },
          }}
        />
      );
  }

  // Signed-out users must not resume a protected onboarding step after a
  // reload. Keep Welcome, Sign in and Create account available.
  const publicPaths = ["/welcome", "/sign-in", "/create-account"];
  if (session === "signedOut" && !publicPaths.includes(pathname)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="about-you" options={{ gestureEnabled: false }} />
      <Stack.Screen name="start" options={{ gestureEnabled: false }} />
      <Stack.Screen name="pet" options={{ gestureEnabled: false }} />
      <Stack.Screen name="invite-family" options={{ gestureEnabled: false }} />
      <Stack.Screen name="focus" />
      <Stack.Screen name="pace" />
      <Stack.Screen name="care-notes" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
