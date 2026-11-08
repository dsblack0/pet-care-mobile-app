import { Stack } from "expo-router";

// The recap lives under the Memories tab so the tab bar stays visible.
export default function MemoriesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
