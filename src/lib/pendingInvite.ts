import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'petcare.pendingInvitationToken';
export async function rememberInvitation(token: string) {
  if (/^[A-Za-z0-9_-]{20,}$/.test(token)) await AsyncStorage.setItem(KEY, token);
}
export async function pendingInvitation() { return AsyncStorage.getItem(KEY); }
export async function clearPendingInvitation() { await AsyncStorage.removeItem(KEY); }
