import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { dataVersionStore } from "@/lib/store";

export type FamilyPlan = "free" | "plus";
export type FamilyChallengeSettings = {
  plan: FamilyPlan;
  weeklyCount: number;
  restrictions: string[];
  verifiedMedicationPlan: boolean;
};
export const defaultSettings: FamilyChallengeSettings = {
  plan: "free",
  weeklyCount: 3,
  restrictions: [],
  verifiedMedicationPlan: false,
};
const ref = (petId: string) => doc(db, "pets", petId, "settings", "challenges");
export async function getChallengeSettings(
  petId: string,
): Promise<FamilyChallengeSettings> {
  const s = await getDoc(ref(petId));
  const d = s.data() ?? {};
  return {
    plan: d.plan === "plus" ? "plus" : "free",
    weeklyCount: Math.max(1, Math.min(7, Number(d.weeklyCount) || 3)),
    restrictions: Array.isArray(d.restrictions)
      ? d.restrictions.filter((x): x is string => typeof x === "string")
      : [],
    verifiedMedicationPlan: d.verifiedMedicationPlan === true,
  };
}
export async function setChallengeSettings(
  petId: string,
  values: Partial<FamilyChallengeSettings>,
) {
  await setDoc(ref(petId), values, { merge: true });
  dataVersionStore.set(dataVersionStore.get() + 1);
}
