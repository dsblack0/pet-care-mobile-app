import { router } from "expo-router";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PetForm } from "@/components/pet/PetForm";
import { createOnboardingPet } from "@/lib/onboardingData";

export default function OnboardingPetScreen() {
  return (
    <OnboardingShell
      step={2}
      canGoBack={false}
      title="Who are we caring for?"
      subtitle="Tell us about your pet. Their challenges are built around them."
    >
      <PetForm
        submitLabel="Continue"
        footerHint="You can add more pets later from your profile."
        onSubmit={async (input) => {
          await createOnboardingPet(input);
          router.replace("/invite-family");
        }}
      />
    </OnboardingShell>
  );
}
