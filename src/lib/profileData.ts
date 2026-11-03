// Data for the User Profile screen. Mock-backed like homeData/logData.
import * as mock from '@/data/mockData';
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
  const user = mock.users.find((u) => u.userId === userId);
  if (!user) return null;

  const links = mock.userPets.filter((up) => up.userId.id === userId);
  const pets = links
    .map((up) => mock.pets.find((p) => p.petId === up.petId.id))
    .filter((p): p is Pet => !!p)
    .map((pet) => {
      const memberIds = mock.userPets
        .filter((up) => up.petId.id === pet.petId && up.userId.id !== userId)
        .map((up) => up.userId.id);
      return {
        pet,
        level: mock.levels.find((l) => l.levelNum === pet.level) ?? null,
        sharedWith: mock.users.filter((u) => memberIds.includes(u.userId)).map((u) => u.name),
      };
    });

  return { user, isOrganizer: links.some((up) => up.role === 'owner'), pets };
}
