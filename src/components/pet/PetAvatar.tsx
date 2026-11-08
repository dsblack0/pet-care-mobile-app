import { Image, StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { getFaceSpec } from "@/components/pet/faceSpecs";
import { PetFace } from "@/components/pet/PetFace";
import { useImageUrl } from "@/lib/storage";
import type { Pet } from "@/types/firestore";

/** The pet's photo from Storage, or its animated face if it has none. */
export function PetAvatar({ pet, size = 52 }: { pet: Pet; size?: number }) {
  const url = useImageUrl(pet.petPhotoPath);
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (url) return <Image source={{ uri: url }} style={[styles.base, box]} />;
  return (
    <View
      style={[
        styles.base,
        box,
        { backgroundColor: getFaceSpec(pet.species).halo },
      ]}
    >
      <PetFace
        species={pet.species}
        mood="calm"
        size={size - 4}
        scrollY={scrollY}
        atBottom={atBottom}
        tappable={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
});
