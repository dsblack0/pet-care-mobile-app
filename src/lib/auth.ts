// Firebase Auth (email + password) and the app's session state.
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { Platform } from "react-native";

import { DEMO_USER_ID } from "@/constants/session";
import { createStore, selectedPetStore } from "@/lib/store";
import { app, db } from "../../firebaseConfig";
import { createUser } from "../../models/users";

// Keep the sign-in across app restarts on iOS/Android.
function makeAuth(): Auth {
  if (Platform.OS === "web") return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
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
export type SessionStatus = "loading" | "signedOut" | "onboarding" | "ready";
export const sessionStore = createStore<SessionStatus>("loading");

// Auth state is restored asynchronously. Check existing memberships using the original
// auto-generated userPets document IDs; never infer membership from document IDs.
let onboardingInProgress = false;
let demoMode = false;
let authRevision = 0;
onAuthStateChanged(auth, async (user) => {
  const revision = ++authRevision;
  if (!user) {
    if (__DEV__ && demoMode) return;
    selectedPetStore.set(null);
    sessionStore.set("signedOut");
    return;
  }
  if (onboardingInProgress) {
    sessionStore.set("onboarding");
    return;
  }
  sessionStore.set("loading");
  try {
    await restoreExistingPetOrOnboarding(user.uid, revision);
  } catch (error) {
    if (revision !== authRevision) return;
    console.warn("Unable to load family memberships:", error);
    // A failed lookup is not evidence that this is a new account.
    sessionStore.set("ready");
  }
});

/** Load memberships by user reference, never by userPets document ID.
 * Select the first pet alphabetically, matching fetchPetsForUser(). */
async function restoreExistingPetOrOnboarding(uid: string, revision: number) {
  const memberships = await getDocs(
    query(
      collection(db, "userPets"),
      where("userId", "==", doc(db, "users", uid)),
    ),
  );
  if (revision !== authRevision || auth.currentUser?.uid !== uid) return;
  if (memberships.empty) {
    selectedPetStore.set(null);
    sessionStore.set("onboarding");
    return;
  }
  const petIds = [
    ...new Set(
      memberships.docs
        .map((m) => m.data().petId?.id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const pets = await Promise.all(
    petIds.map(async (id) => {
      const snapshot = await getDoc(doc(db, "pets", id));
      return snapshot.exists()
        ? { id, name: String(snapshot.data().name ?? "") }
        : null;
    }),
  );
  if (revision !== authRevision || auth.currentUser?.uid !== uid) return;
  const first = pets
    .filter((pet): pet is { id: string; name: string } => pet !== null)
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  selectedPetStore.set(first?.id ?? null);
  sessionStore.set("ready");
}

/** Development-only legacy demo: browse the seeded Firestore user without authentication. */
export function enterDemoMode() {
  if (!__DEV__) return;
  demoMode = true;
  selectedPetStore.set(null);
  sessionStore.set("ready");
}

/** Require a real authenticated identity for Firestore operations. */
export function currentUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid && __DEV__ && demoMode) return DEMO_USER_ID;
  if (!uid) throw new Error("Please sign in first.");
  return uid;
}

/** Create the Auth account and its users document, then start onboarding. */
export async function createAccount(
  name: string,
  email: string,
  password: string,
) {
  onboardingInProgress = true;
  sessionStore.set("onboarding");
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    await setDoc(
      doc(db, "users", user.uid),
      createUser(name.trim(), email.trim().toLowerCase(), {
        email: true,
        text: false,
        push: true,
      }),
    );
    await sendEmailVerification(user);
  } catch (e) {
    sessionStore.set(auth.currentUser ? "onboarding" : "signedOut");
    throw e;
  } finally {
    onboardingInProgress = false;
  }
}

export async function signIn(
  email: string,
  password: string,
  options?: { invitationFlow?: boolean },
) {
  demoMode = false;
  const { user } = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  // Resolve the destination before returning so an existing account never sees onboarding.
  const revision = ++authRevision;
  sessionStore.set("loading");
  await restoreExistingPetOrOnboarding(user.uid, revision);
  // Keep invitation-origin sign-in on the invite screen until the family join is completed.
  if (options?.invitationFlow && revision === authRevision)
    sessionStore.set("onboarding");
}

export async function signOut() {
  demoMode = false;
  selectedPetStore.set(null);
  sessionStore.set("signedOut");
  await firebaseSignOut(auth);
}

/** Readable text for Firebase Auth error codes. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don’t match.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn’t turned on in the Firebase console yet.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    default:
      return e instanceof Error ? e.message : String(e);
  }
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error("Sign in first.");
  await sendEmailVerification(auth.currentUser);
}
export async function refreshEmailVerification() {
  if (!auth.currentUser) throw new Error("Sign in first.");
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}
