import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  type User as AuthUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, signedInId } from "./core";
import { db } from "../firebaseConfig";
import { createUser } from "../models/users";

export function observeAuth(callback: (user: AuthUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
export async function register(email: string, password: string, name: string) {
  if (!name.trim()) throw new Error("Name is required.");
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  await updateProfile(credential.user, { displayName: name.trim() });
  await setDoc(
    doc(db, "users", credential.user.uid),
    createUser(name.trim(), credential.user.email!, {
      email: true,
      text: false,
      push: true,
    }),
  );
  await sendEmailVerification(credential.user);
  return credential.user;
}
export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  const profile = await getDoc(doc(db, "users", credential.user.uid));
  if (!profile.exists())
    await setDoc(
      profile.ref,
      createUser(
        credential.user.displayName || "Pet parent",
        credential.user.email!,
        { email: true, text: false, push: true },
      ),
    );
  return credential.user;
}
export async function requestEmailVerification() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (!user.emailVerified) await sendEmailVerification(user);
}
export async function refreshEmailVerification() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  await reload(user);
  return user.emailVerified;
}
export const logout = () => signOut(auth);
export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());
export const currentUserId = signedInId;
