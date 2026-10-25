import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EvalRun } from "./runner";
const KEY = "pet-weekly:evaluation:last-run";
export async function saveEvalRun(run: EvalRun) {
  await AsyncStorage.setItem(KEY, JSON.stringify(run));
}
export async function loadEvalRun(): Promise<EvalRun | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
export async function clearEvalRun() {
  await AsyncStorage.removeItem(KEY);
}
