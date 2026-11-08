import { GeoPoint } from "firebase/firestore";
/** Location is optional; the existing Memory model stores coordinates, not address text. */
export function manualCoordinates(
  latitude: number,
  longitude: number,
): GeoPoint {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error("Invalid coordinates.");
  return new GeoPoint(latitude, longitude);
}
export async function currentCoordinates(): Promise<GeoPoint> {
  const Location = await import("expo-location");
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Location permission denied.");
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return manualCoordinates(position.coords.latitude, position.coords.longitude);
}
export async function searchAddress(address: string): Promise<GeoPoint> {
  if (!address.trim()) throw new Error("Enter a location.");
  const Location = await import("expo-location");
  const results = await Location.geocodeAsync(address.trim());
  if (!results.length) throw new Error("Location not found.");
  return manualCoordinates(results[0].latitude, results[0].longitude);
}
