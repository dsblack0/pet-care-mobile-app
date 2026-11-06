// Data for the Memories tab and the monthly recap, backed by Firestore. Recaps are built with
// the team's models/recaps and only saved when the user taps Save.
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

import { getMemoriesForPet, getUsersById } from '@/lib/db';
import { toDate } from '@/lib/homeData';
import { uploadImage } from '@/lib/storage';
import { dataVersionStore } from '@/lib/store';
import type { Memory, User } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import {
  getMemoryReference,
  getPetReference,
  getUserReference,
} from '../../firebaseServices/recapsService';
import { createRecap } from '../../models/recaps';

export type MemoriesPage = {
  /** Newest first. */
  memories: Memory[];
  usersById: Record<string, User>;
  /** Logged on this calendar day one year ago, if any. */
  yearAgo: Memory | null;
  /** This calendar month, newest first. */
  thisMonth: Memory[];
};

function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function fetchMemoriesPage(petId: string): Promise<MemoriesPage> {
  const now = new Date();
  const memories = await getMemoriesForPet(petId);

  const yearAgo =
    memories.find((m) => {
      const d = toDate(m.occurredAt);
      return (
        d.getFullYear() === now.getFullYear() - 1 &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }) ?? null;

  const { start, end } = monthRange(now);
  const thisMonth = memories.filter((m) => {
    const d = toDate(m.occurredAt);
    return d >= start && d <= end;
  });

  const usersById = await getUsersById(
    memories.flatMap((m) => [m.createdBy.id, ...m.participants.map((p) => p.id)]),
  );
  return { memories, usersById, yearAgo, thisMonth };
}

export type RecapDraft = {
  start: Date;
  end: Date;
  memories: Memory[];
  /** Family members who took part, in order of first appearance. */
  people: User[];
};

/** Select this month's memories for a recap. Nothing is saved until saveRecap. */
export async function buildRecapDraft(petId: string): Promise<RecapDraft> {
  const { start, end } = monthRange();
  const memories = (await getMemoriesForPet(petId)).filter((m) => {
    const d = toDate(m.occurredAt);
    return d >= start && d <= end;
  });

  const ids = [...new Set(memories.flatMap((m) => m.participants.map((p) => p.id)))];
  const usersById = await getUsersById(ids);
  const people = ids.map((id) => usersById[id]).filter((u): u is User => !!u);

  return { start, end, memories, people };
}

/**
 * Save a recap. `localImageUri` is the rendered story card; it's uploaded to Storage and its
 * path is saved as exportPath.
 */
export async function saveRecap(input: {
  petId: string;
  createdBy: string;
  title: string;
  caption: string;
  draft: RecapDraft;
  localImageUri: string | null;
}): Promise<string> {
  const recapId = doc(collection(db, 'recaps')).id;
  const exportPath = input.localImageUri
    ? await uploadImage(input.localImageUri, `recaps/${recapId}.png`)
    : null;

  const recap = createRecap(
    getPetReference(input.petId),
    getUserReference(input.createdBy),
    input.title,
    input.caption,
    Timestamp.fromDate(input.draft.start),
    Timestamp.fromDate(input.draft.end),
    input.draft.memories.map((m) => getMemoryReference(m.memoryId)),
    exportPath,
  );
  // setDoc (not saveRecap's addDoc) so the document uses the id the image is named after.
  await setDoc(doc(db, 'recaps', recapId), recap);
  dataVersionStore.set(dataVersionStore.get() + 1);
  return recapId;
}
