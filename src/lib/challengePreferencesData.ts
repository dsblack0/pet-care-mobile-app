// A pet's challenge preferences (which care areas and which family members challenges should
// include). One document per pet, built with the team's models/challengePreferences.
import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';

import { getFamily, petRef, userRef } from '@/lib/db';
import { dataVersionStore } from '@/lib/store';
import type { User } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import { saveChallengePreference } from '../../firebaseServices/challengePreferencesService';
import { createChallengePreference } from '../../models/challengePreferences';

/** Care areas the challenge generator supports, as the app's activity types. */
export const CHALLENGE_ACTIVITIES = ['Feed', 'Walk', 'Train', 'Play', 'Groom', 'Medication'] as const;

export type PreferencesPage = {
  family: User[];
  /** null until preferences have been saved for this pet. */
  saved: { activityTypes: string[]; userIds: string[]; participantsByActivity: Record<string, string[]> } | null;
};

async function findPreferenceDoc(petId: string) {
  const q = query(collection(db, 'challengePreferences'), where('petId', '==', petRef(petId)));
  return (await getDocs(q)).docs[0] ?? null;
}

export async function fetchChallengePreferences(petId: string): Promise<PreferencesPage> {
  const [family, existing] = await Promise.all([getFamily(petId), findPreferenceDoc(petId)]);
  const data = existing?.data();
  return {
    family,
    saved: data
      ? {
          activityTypes: data.activityTypes ?? [],
          userIds: (data.userIds ?? []).map((r: { id: string }) => r.id),
          participantsByActivity: Object.fromEntries(
            Object.entries(data.participantsByActivity ?? {}).map(([activity, ids]) => [
              activity, (ids as Array<string | { id: string }>).map((id) => typeof id === 'string' ? id : id.id),
            ]),
          ),
        }
      : null,
  };
}

/** Update the pet's preferences, or create them the first time. */
export async function saveChallengePreferences(
  petId: string,
  userIds: string[],
  activityTypes: string[],
  participantsByActivity?: Record<string, string[]>,
): Promise<void> {
  const existing = await findPreferenceDoc(petId);
  const byActivity = participantsByActivity ?? Object.fromEntries(activityTypes.map((a) => [a, userIds]));
  if (existing) {
    await updateDoc(existing.ref, { userIds: userIds.map(userRef), activityTypes, participantsByActivity: byActivity });
  } else {
    const created = await saveChallengePreference(
      createChallengePreference(petRef(petId), userIds.map(userRef), activityTypes),
    );
    // The existing service creates the document; locate it to add the per-area choices.
    const savedDoc = await findPreferenceDoc(petId);
    if (savedDoc) await updateDoc(savedDoc.ref, { participantsByActivity: byActivity });
  }
  dataVersionStore.set(dataVersionStore.get() + 1);
}
