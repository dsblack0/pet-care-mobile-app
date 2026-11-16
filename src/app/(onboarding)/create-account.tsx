import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { View } from "react-native";

import { PhotoPickerCard } from "@/components/form/PhotoPickerCard";
import {
  FooterLink,
  OnboardingShell,
  onboardingStyles,
} from "@/components/onboarding/OnboardingShell";
import { TextField } from "@/components/onboarding/TextField";
import { authErrorMessage, createAccount } from "@/lib/auth";
import { pendingInvitation, rememberInvitation } from "@/lib/pendingInvite";
import { uploadImage } from "@/lib/storage";

export default function CreateAccountScreen() {
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>();
  const [name, setName] = useState("");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
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
      setError("Please fill in your first name, email and password.");
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
      await createAccount(name, email, password, null, null, profilePhotoPath);
      // About you sends invited people on to their invitation afterwards.
      router.replace("/about-you");
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      title="Create your account"
      subtitle="Your family will see your first name when you log care for your pet."
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
          label="First name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
          autoComplete="given-name"
          textContentType="givenName"
        />
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
