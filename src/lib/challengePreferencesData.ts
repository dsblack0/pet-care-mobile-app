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
  saved: { activityTypes: string[]; userIds: string[] } | null;
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
        }
      : null,
  };
}

/** Update the pet's preferences, or create them the first time. */
export async function saveChallengePreferences(
  petId: string,
  userIds: string[],
  activityTypes: string[],
): Promise<void> {
  const existing = await findPreferenceDoc(petId);
  if (existing) {
    await updateDoc(existing.ref, { userIds: userIds.map(userRef), activityTypes });
  } else {
    await saveChallengePreference(
      createChallengePreference(petRef(petId), userIds.map(userRef), activityTypes),
    );
  }
  dataVersionStore.set(dataVersionStore.get() + 1);
}
