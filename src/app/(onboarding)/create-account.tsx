import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Text, View } from "react-native";

import { fieldStyles } from "@/components/form/fieldStyles";
import { PhotoPickerCard } from "@/components/form/PhotoPickerCard";
import { SelectField } from "@/components/form/SelectField";
import {
  FooterLink,
  OnboardingShell,
  onboardingStyles,
} from "@/components/onboarding/OnboardingShell";
import { TextField } from "@/components/onboarding/TextField";
import { authErrorMessage, createAccount } from "@/lib/auth";
import { pendingInvitation, rememberInvitation } from "@/lib/pendingInvite";
import { uploadImage } from "@/lib/storage";
import type { UserGender } from "../../../models/users";

const GENDER_LABELS = ["Male", "Female", "Other"] as const;
type GenderLabel = (typeof GENDER_LABELS)[number];
const GENDER_VALUES: Record<GenderLabel, UserGender> = {
  Male: "male",
  Female: "female",
  Other: "other",
};

export default function CreateAccountScreen() {
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>();
  const [name, setName] = useState("");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<GenderLabel | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) setProfilePhotoUri(result.assets[0].uri);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not open photos. Please try again.",
      );
    }
  };

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in your name, email and password.");
      return;
    }
    if (age && !/^\d+$/.test(age)) {
      setError("Enter a whole-number age, or leave it blank.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Resolve and persist the invite before Firebase changes auth state.
      const token = invitationId || (await pendingInvitation());
      if (token) await rememberInvitation(token);
      const profilePhotoPath = profilePhotoUri
        ? await uploadImage(profilePhotoUri, "users/profile.jpg")
        : null;
      await createAccount(
        name,
        email,
        password,
        age === "" ? null : Number(age),
        gender ? GENDER_VALUES[gender] : null,
        profilePhotoPath,
      );
      if (token)
        router.replace({
          pathname: "/invite/[invitationId]",
          params: { invitationId: token },
        });
      else router.replace("/pet");
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={1}
      title="Create your account"
      subtitle="Your family will see your name when you log care for your pet."
      buttonLabel="Create account"
      onPress={submit}
      busy={busy}
      error={error}
      footer={
        <FooterLink
          label="Already have an account? Sign in"
          onPress={() =>
            router.replace(
              invitationId
                ? { pathname: "/sign-in", params: { invitationId } }
                : "/sign-in",
            )
          }
        />
      }
    >
      <PhotoPickerCard
        photoUri={profilePhotoUri}
        emptyLabel="User photo"
        onPress={() => void pickProfilePhoto()}
        disabled={busy}
      />
      <View style={[onboardingStyles.card, onboardingStyles.form]}>
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex Johnson"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label="Age (optional)"
          value={age}
          onChangeText={(value) => setAge(value.replace(/[^0-9]/g, ""))}
          placeholder="Enter your age"
          keyboardType="number-pad"
          maxLength={3}
        />
        <View>
          <Text style={fieldStyles.label}>Gender (optional)</Text>
          <SelectField
            label="Gender (optional)"
            placeholder="Select gender (optional)"
            value={gender}
            options={GENDER_LABELS}
            onChange={setGender}
          />
        </View>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </View>
    </OnboardingShell>
  );
}
