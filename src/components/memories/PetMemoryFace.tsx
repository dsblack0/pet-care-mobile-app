import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { getFaceSpec } from "@/components/pet/faceSpecs";
import { PetFace } from "@/components/pet/PetFace";
import type { Pet } from "@/types/firestore";

/** Reuses the same pet illustration shown on Home for photo-less Other memories. */
export function PetMemoryFace({ pet, size = 96 }: { pet: Pet; size?: number }) {
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: getFaceSpec(pet.species).halo }}>
    <PetFace species={pet.species} mood="calm" size={size - 4} scrollY={scrollY} atBottom={atBottom} tappable={false} />
  </View>;
}
