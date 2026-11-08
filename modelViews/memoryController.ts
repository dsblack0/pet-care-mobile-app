import {
  collection,
  doc,
  getDocs,
  query,
  where,
  GeoPoint,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { createMemory } from "../models/memories";
import type { Memory } from "../models/memories";
import { uploadImage } from "../src/lib/storage";
import {
  changed,
  petReference,
  requireMember,
  signedInId,
  userReference,
} from "./core";
import { getPoints } from "../firebaseServices/pointsService";
export type MemoryInput = {
  petId: string;
  activityType: string;
  occurredAt: Date;
  participants: string[];
  description?: string;
  localPhotoUri?: string;
  location?: GeoPoint | null;
  durationMinutes?: number;
};
export async function logMemory(input: MemoryInput) {
  await requireMember(input.petId);
  for (const id of input.participants) await requireMember(input.petId, id);
  const id = doc(collection(db, "memories")).id;
  const photo = input.localPhotoUri
    ? await uploadImage(input.localPhotoUri, `memories/${id}.jpg`)
    : null;
  const base = (await getPoints(input.activityType))?.pointsGained ?? 0;
  const bonus =
    input.participants.length > 1
      ? ((await getPoints("TogetherBonus"))?.pointsGained ?? 0)
      : 0;
  const memory = createMemory(
    petReference(input.petId),
    userReference(signedInId()),
    Timestamp.fromDate(input.occurredAt),
    input.description ?? "",
    input.activityType,
    input.participants.map(userReference),
    photo,
    input.location ?? null,
    null,
    input.durationMinutes ?? null,
    base,
    bonus,
  );
  await setDoc(doc(db, "memories", id), memory);
  changed();
  return { memoryId: id, ...memory };
}
export async function listMemories(petId: string) {
  await requireMember(petId);
  const snap = await getDocs(
    query(
      collection(db, "memories"),
      where("petId", "==", petReference(petId)),
    ),
  );
  return snap.docs
    .map((d) => ({ memoryId: d.id, ...d.data() }) as Memory)
    .sort((a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis());
}
