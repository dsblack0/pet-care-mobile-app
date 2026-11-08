import { Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { auth, sessionStore } from '@/lib/auth';
import { registerForPush, unregisterForPush } from '@/lib/push';
import * as Notifications from 'expo-notifications';
import { pendingInvitation } from '@/lib/pendingInvite';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const session = sessionStore.useValue();
  const pathname = usePathname();
  const router = useRouter();
  const ready = (loaded || !!error) && session !== 'loading';
  // Only perform the cold-start redirect once. Subsequent navigation (including
  // invitation acceptance and onboarding) is controlled by the screens themselves.
  const startupHandled = useRef(false);

  useEffect(() => {
    if (!ready || startupHandled.current) return;
    startupHandled.current = true;
    let cancelled = false;
    void (async () => {
      // A deep link takes precedence over the normal startup destination.
      if (pathname.startsWith('/invite/')) return;
      // An unfinished invitation must be resumed before new-pet onboarding.
      const token = await pendingInvitation();
      if (cancelled) return;
      if (token) {
        router.replace({ pathname: '/invite/[invitationId]', params: { invitationId: token } });
      } else if (session === 'signedOut') {
        router.replace('/welcome');
      } else if (session === 'ready') {
        router.replace('/');
      } else {
        router.replace('/pet');
      }
    })();
    return () => { cancelled = true; };
  }, [ready, session, pathname, router]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) void registerForPush().catch(e => console.warn('Push registration failed', e));
      else void unregisterForPush();
    });
    const listener = Notifications.addNotificationResponseReceivedListener(response => {
      const petId = response.notification.request.content.data?.petId;
      if (typeof petId === 'string' && auth.currentUser) router.push('/(tabs)/family');
    });
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (response && typeof response.notification.request.content.data?.petId === 'string' && auth.currentUser) router.push('/(tabs)/family');
    }).catch(() => {});
    return () => { unsub(); listener.remove(); };
  }, [router]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="invite/[invitationId]" options={{ headerShown: false }} />
        <Stack.Screen name="invite-code" options={{ title: 'Invitation code' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
