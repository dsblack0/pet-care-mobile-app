import { Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Opened from the invite link: petcare://invite/<invitationId> */}
        <Stack.Screen name="invite/[invitationId]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
