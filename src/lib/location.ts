// The device's current location for the Log Activity form.
import * as Location from "expo-location";
import { Platform } from "react-native";

export type Place = {
  latitude: number;
  longitude: number;
  /** e.g. "Schenley Park, Pittsburgh". Saved alongside coordinates in Firestore. */
  label: string;
};

export class LocationPermissionError extends Error {}

export async function getCurrentPlace(): Promise<Place> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationPermissionError(
      "Location access is off. You can turn it on in Settings.",
    );
  }

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const label = await reverseGeocodePlace(coords);
  return { latitude: coords.latitude, longitude: coords.longitude, label: label ?? "Location unavailable" };
}

// Never expose raw GPS coordinates in the UI, even for legacy memories.
export function readableLocationLabel(label?: string | null): string | null {
  const text = label?.trim();
  if (!text || text === "Saved location" || text === "Location unavailable") return null;
  // Reject latitude/longitude pairs (including labels with coordinate prefixes).
  if (/[-+]?\d{1,3}\.\d+\s*[,;]\s*[-+]?\d{1,3}\.\d+/.test(text)) return null;
  return text;
}

export async function reverseGeocodePlace(coords: { latitude: number; longitude: number }): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    // Android requires foreground location permission even when the coordinates
    // were previously saved in Firestore. Without it, reverse geocoding throws
    // and the detail screen cannot display an address for older memories.
    if (Platform.OS === "android") {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (requested.status !== "granted") return null;
      }
    }
    const [address] = await Location.reverseGeocodeAsync(coords);
    if (!address) return null;
    const street = [address.streetNumber, address.street].filter(Boolean).join(" ").trim();
    const locality = address.district || address.subregion || address.city;
    const parts = [street || address.name, locality, address.city, address.region]
      .filter((part): part is string => !!part && !!part.trim());
    return readableLocationLabel([...new Set(parts)].join(", "));
  } catch { return null; }
}

/** Resolve a readable label before committing a memory to Firestore. */
export async function resolveLocationForSave(
  place: { latitude: number; longitude: number; label?: string } | null | undefined,
): Promise<string | null> {
  if (!place) return null;
  // Prefer a fresh address lookup, then a previously saved human-readable label.
  // A failed lookup must never replace an existing good label with a placeholder.
  return (await reverseGeocodePlace(place)) ?? readableLocationLabel(place.label);
}
