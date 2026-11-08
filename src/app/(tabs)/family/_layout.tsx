import { Stack } from "expo-router";

// Profile and Tutorials live under the Family tab so the tab bar stays visible.
export default function FamilyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
