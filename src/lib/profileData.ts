// Data for the User Profile screen, read from Firestore.
import {
  getLevels,
  getPet,
  getUser,
  getUserPetsForPet,
  getUserPetsForUser,
  getUsersById,
} from '@/lib/db';
import type { Level, Pet, User } from '@/types/firestore';

export type ProfilePet = {
  pet: Pet;
  level: Level | null;
  /** Other family members' names for this pet. */
  sharedWith: string[];
};

export type ProfileData = {
  user: User;
  /** Owner of at least one pet. */
  isOrganizer: boolean;
  pets: ProfilePet[];
};

export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const user = await getUser(userId);
  if (!user) return null;

  const [links, levels] = await Promise.all([getUserPetsForUser(userId), getLevels()]);
  const pets = await Promise.all(
    links.map(async (link): Promise<ProfilePet | null> => {
      const pet = await getPet(link.petId.id);
      if (!pet) return null;
      const others = (await getUserPetsForPet(pet.petId))
        .map((up) => up.userId.id)
        .filter((id) => id !== userId);
      const usersById = await getUsersById(others);
      return {
        pet,
        level: levels.find((l) => l.levelNum === pet.level) ?? null,
        sharedWith: others.map((id) => usersById[id]?.name).filter((n): n is string => !!n),
      };
    }),
  );

  return {
    user,
    isOrganizer: links.some((up) => up.role === 'owner'),
    pets: pets.filter((p): p is ProfilePet => !!p),
  };
}
