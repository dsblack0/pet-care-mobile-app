import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ContextType, ChallengeType, ActivityType } from "./schema";
const key = (name: string) => "pet-weekly-v1:" + name;
export async function saveContext(c: ContextType) {
  await AsyncStorage.setItem(key("context"), JSON.stringify(c));
}
export async function loadContext(): Promise<ContextType | null> {
  const v = await AsyncStorage.getItem(key("context"));
  return v ? JSON.parse(v) : null;
}
export async function saveWeek(week: string, challenges: ChallengeType[]) {
  await AsyncStorage.setItem(key("week:" + week), JSON.stringify(challenges));
}
export async function loadWeek(week: string): Promise<ChallengeType[]> {
  const v = await AsyncStorage.getItem(key("week:" + week));
  return v ? JSON.parse(v) : [];
}
export async function saveActivities(week: string, activities: ActivityType[]) {
  await AsyncStorage.setItem(
    key("activities:" + week),
    JSON.stringify(activities),
  );
}
export async function loadActivities(week: string): Promise<ActivityType[]> {
  const v = await AsyncStorage.getItem(key("activities:" + week));
  return v ? JSON.parse(v) : [];
}
