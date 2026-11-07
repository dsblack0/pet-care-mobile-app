// The device's current location for the Log Activity form.
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type Place = {
  latitude: number;
  longitude: number;
  /** e.g. "Schenley Park, Pittsburgh". Shown only; Firestore stores the coordinates. */
  label: string;
};

export class LocationPermissionError extends Error {}

export async function getCurrentPlace(): Promise<Place> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationPermissionError('Location access is off. You can turn it on in Settings.');
  }

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const fallback = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

  // Reverse geocoding is iOS/Android only.
  if (Platform.OS === 'web') return { ...coords, label: fallback };
  try {
    const [address] = await Location.reverseGeocodeAsync(coords);
    const parts = [address?.name ?? address?.street, address?.city].filter(
      (p, i, all): p is string => !!p && all.indexOf(p) === i,
    );
    return { latitude: coords.latitude, longitude: coords.longitude, label: parts.join(', ') || fallback };
  } catch {
    return { latitude: coords.latitude, longitude: coords.longitude, label: fallback };
  }
}
