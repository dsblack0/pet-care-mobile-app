import { Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { sessionStore } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const session = sessionStore.useValue();
  const ready = (loaded || !!error) && session !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Opened from the invite link: petcare://invite/<invitationId> */}
        <Stack.Screen name="invite/[invitationId]" options={{ headerShown: false }} />
        <Stack.Screen name="invite-code" options={{ title: 'Invitation code' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
