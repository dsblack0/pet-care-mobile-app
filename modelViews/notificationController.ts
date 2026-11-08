import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { changed, signedInId, userReference } from './core';
import Constants from 'expo-constants';

/** No scheduled/local reminders: the family screen sends an immediate predefined nudge. */
export async function registerPushToken() {
  if (Constants.appOwnership === 'expo') return null; // Expo Go cannot receive remote push.
  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');
  if (!Device.isDevice) return null;
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications permission denied.');
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Configure the EAS project ID for Expo push notifications.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  // Multiple devices: deterministic document per token, associated with signed-in user.
  const tokenKey = encodeURIComponent(token);
  await setDoc(doc(db, 'pushTokens', tokenKey), { userId: userReference(signedInId()), token, updatedAt: Timestamp.now() });
  return token;
}
export async function unregisterPushToken(token: string) {
  // Security rules must allow deleting only one's own token document.
  await deleteDoc(doc(db, 'pushTokens', encodeURIComponent(token)));
}
export async function remindFamilyMember(petId: string, recipientId: string) {
  if (recipientId === signedInId()) throw new Error('You cannot remind yourself.');
  throw new Error('Remote push reminders are disabled in the free-plan test build.');
}
