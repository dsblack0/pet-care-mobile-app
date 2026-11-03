import { Stack } from 'expo-router';

// Challenge progress and Rewards live under the Challenges tab so the tab bar stays visible.
export default function ChallengesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
