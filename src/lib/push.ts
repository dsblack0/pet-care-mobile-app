import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth } from '@/lib/auth';
import { db } from '../../firebaseConfig';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
const KEY = 'pawmily.push.device';
let registered: { uid: string; id: string } | null = null;
const deviceId = async () => {
  const Storage = (await import('@react-native-async-storage/async-storage')).default;
  let id = await Storage.getItem(KEY);
  if (!id) { id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`; await Storage.setItem(KEY, id); }
  return id;
};
export async function registerForPush(): Promise<void> {
  const user = auth.currentUser;
  if (!user || Platform.OS === 'web' || !Device.isDevice || Constants.appOwnership === 'expo') return;
  const permission = await Notifications.getPermissionsAsync();
  const allowed = permission.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!allowed) return;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('family', { name: 'Family reminders', importance: Notifications.AndroidImportance.HIGH });
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) { console.warn('Push: missing EAS project ID'); return; }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const id = await deviceId();
  await setDoc(doc(db, 'users', user.uid, 'pushDevices', id), { token, platform: Platform.OS, updatedAt: serverTimestamp() });
  registered = { uid: user.uid, id };
}
export async function unregisterForPush() {
  if (!registered) return;
  const { uid, id } = registered;
  registered = null;
  try { await deleteDoc(doc(db, 'users', uid, 'pushDevices', id)); } catch (e) { console.warn('Could not remove push token', e); }
}
export async function sendFamilyReminder(petId: string, recipientId: string, petName: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to send a reminder.');
  const endpoint = process.env.EXPO_PUBLIC_PUSH_WORKER_URL;
  if (!endpoint) throw new Error('Configure EXPO_PUBLIC_PUSH_WORKER_URL to enable reminders.');
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/remind`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ petId, recipientId, petName }),
  });
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error ?? `Reminder failed (${response.status}).`); }
}
