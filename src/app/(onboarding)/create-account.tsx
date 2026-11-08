import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  FooterLink,
  OnboardingShell,
  onboardingStyles,
} from '@/components/onboarding/OnboardingShell';
import { TextField } from '@/components/onboarding/TextField';
import { authErrorMessage, createAccount } from '@/lib/auth';
import { pendingInvitation, rememberInvitation } from '@/lib/pendingInvite';

export default function CreateAccountScreen() {
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Resolve and persist the invite before Firebase changes auth state.
      const token = invitationId || await pendingInvitation();
      if (token) await rememberInvitation(token);
      await createAccount(name, email, password);
      if (token) router.replace({ pathname: '/invite/[invitationId]', params: { invitationId: token } });
      else router.replace('/pet');
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
        <FooterLink label="Already have an account? Sign in" onPress={() => router.replace(invitationId ? { pathname: '/sign-in', params: { invitationId } } : '/sign-in')} />
      }
    >
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
