import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { auth } from "../src/lib/auth";
import { dataVersionStore } from "../src/lib/store";

export { auth };
export const petReference = (id: string) => doc(db, "pets", id);
export const userReference = (id: string) => doc(db, "users", id);
export function signedInId(): string {
  const id = auth.currentUser?.uid;
  if (!id) throw new Error("Please sign in first.");
  return id;
}
export async function requireMember(petId: string, uid = signedInId()) {
  const snap = await getDocs(
    query(
      collection(db, "userPets"),
      where("petId", "==", petReference(petId)),
      where("userId", "==", userReference(uid)),
    ),
  );
  if (snap.empty) throw new Error("You are not a member of this pet family.");
  return snap.docs[0];
}
export async function requireOwner(petId: string) {
  const membership = await requireMember(petId);
  if (membership.data().role !== "owner")
    throw new Error("Only the pet owner can do this.");
}
export function changed() {
  // Screens already observe this store for Firestore refreshes.
  dataVersionStore.set(dataVersionStore.get() + 1);
}
