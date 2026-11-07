// Firebase Auth (email + password) and the app's session state.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { DEMO_USER_ID } from '@/constants/session';
import { createStore, selectedPetStore } from '@/lib/store';
import { app, db } from '../../firebaseConfig';
import { createUser } from '../../models/users';

// Keep the sign-in across app restarts on iOS/Android.
function makeAuth(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialized (fast refresh).
    return getAuth(app);
  }
}

export const auth = makeAuth();

/**
 * loading: waiting for Firebase to restore a saved sign-in.
 * signedOut: show Welcome / Sign in / Create account.
 * onboarding: signed in, still setting up the pet family.
 * ready: show the tabs.
 */
export type SessionStatus = 'loading' | 'signedOut' | 'onboarding' | 'ready';
export const sessionStore = createStore<SessionStatus>('loading');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // The dev-only demo mode has no Firebase user.
    if (sessionStore.get() !== 'ready') sessionStore.set('signedOut');
    return;
  }
  if (sessionStore.get() !== 'onboarding') sessionStore.set('ready');
});

/** The signed-in user's id, or the dummy-data user in demo mode. */
export function currentUserId(): string {
  return auth.currentUser?.uid ?? DEMO_USER_ID;
}

/** Create the Auth account and its users document, then start onboarding. */
export async function createAccount(name: string, email: string, password: string) {
  sessionStore.set('onboarding');
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(
      doc(db, 'users', user.uid),
      createUser(name.trim(), email.trim().toLowerCase(), { email: true, text: false, push: true }),
    );
  } catch (e) {
    sessionStore.set('signedOut');
    throw e;
  }
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOut() {
  selectedPetStore.set(null);
  sessionStore.set('signedOut');
  await firebaseSignOut(auth);
}

/** Dev only: browse the Firestore dummy data as Alex without signing in. */
export function enterDemoMode() {
  sessionStore.set('ready');
}

/** Readable text for Firebase Auth error codes. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password don’t match.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in isn’t turned on in the Firebase console yet.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    default:
      return e instanceof Error ? e.message : String(e);
  }
}
