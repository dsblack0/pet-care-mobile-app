import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeHeader } from "@/components/home/HomeHeader";
import { PetForm } from "@/components/pet/PetForm";
import { colors, fonts } from "@/constants/theme";
import { usePets } from "@/hooks/usePets";
import { currentUserId } from "@/lib/auth";
import { addPet } from "@/lib/petData";
import { selectedPetStore } from "@/lib/store";

export default function AddPetScreen() {
  const { pets, pet } = usePets();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        compact
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleCard}>
            <Text style={styles.title}>Add a Pet</Text>
          </View>
          <PetForm
            submitLabel="Add pet"
            submitIcon="add"
            footerHint="You can add care routines, medications and family access after creating the profile."
            onSubmit={async (input) => {
              await addPet(currentUserId(), input);
              router.navigate("/");
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 12, gap: 20, paddingBottom: 40 },
  titleCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
});
