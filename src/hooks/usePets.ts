import { useEffect, useState } from 'react';

import { currentUserId } from '@/lib/auth';
import { fetchPetsForUser } from '@/lib/homeData';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { Pet } from '@/types/firestore';

/** The signed-in user's pets and the selected one. Reloads after writes (e.g. a new pet). */
export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const selectedPetId = selectedPetStore.useValue();
  const dataVersion = dataVersionStore.useValue();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await fetchPetsForUser(currentUserId());
      if (!cancelled) setPets(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  const pet = pets.find((p) => p.petId === selectedPetId) ?? pets[0] ?? null;
  return { pets, pet };
}
