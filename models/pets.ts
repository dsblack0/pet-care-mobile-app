export interface Pet {
  petId: string;
  name: string;
  species: string;
  breed: string | null;
  gender: "Male" | "Female";
  age: number;
  birthday: string | null;
  petPhotoPath: string | null;
  weight: number | null;
  numberOfMembers: number;
  totalPoints: number;
  level: number;
}

export type NewPet = Omit<Pet, "petId">;

export const createPet = (
  name: string,
  species: string,
  gender: "Male" | "Female",
  age: number,
  breed: string | null = null,
  birthday: string | null = null,
  petPhotoPath: string | null = null,
  weight: number | null = null
): NewPet => {
  return {
    name,
    species,
    breed,
    gender,
    age,
    birthday,
    petPhotoPath,
    weight,
    numberOfMembers: 1,
    totalPoints: 0,
    level: 1,
  };
};