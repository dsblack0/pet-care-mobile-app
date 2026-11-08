import { useEffect, useState } from "react";

import {
  fetchPetHome,
  fetchPetsForUser,
  fetchUser,
  type PetHomeData,
} from "@/lib/homeData";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import type { Pet, User } from "@/types/firestore";

export function useHomeData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [data, setData] = useState<PetHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectedPetId = selectedPetStore.useValue();
  const dataVersion = dataVersionStore.useValue();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [u, p] = await Promise.all([
          fetchUser(userId),
          fetchPetsForUser(userId),
        ]);
        // Until a pet is picked, show the first one.
        const target = p.find((x) => x.petId === selectedPetId) ?? p[0] ?? null;
        const home = target ? await fetchPetHome(target) : null;
        if (cancelled) return;
        setUser(u);
        setPets(p);
        setData(home);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, selectedPetId, reloadKey, dataVersion]);

  const pet = pets.find((p) => p.petId === selectedPetId) ?? pets[0] ?? null;

  const selectPet = (petId: string) => {
    if (petId === pet?.petId) return;
    setLoading(true);
    selectedPetStore.set(petId);
  };

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  return { user, pets, pet, data, loading, error, refresh, selectPet };
}
