import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  FooterLink,
  OnboardingShell,
  onboardingStyles,
} from '@/components/onboarding/OnboardingShell';
import { TextField } from '@/components/onboarding/TextField';
import { authErrorMessage, signIn } from '@/lib/auth';
import { clearPendingInvitation, pendingInvitation } from '@/lib/pendingInvite';

export default function SignInScreen() {
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // On success the session switches to "ready" and the root layout shows the tabs.
  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // A normal sign-in must not reopen a stale invitation from a previous session.
      const token = invitationId || await pendingInvitation();
      if (!token) await clearPendingInvitation();
      await signIn(email, password, { invitationFlow: !!token });
      if (token) router.replace({ pathname: '/invite/[invitationId]', params: { invitationId: token } });
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      title="Welcome back"
      subtitle="Sign in to see how your pet is doing today."
      buttonLabel="Sign in"
      onPress={submit}
      busy={busy}
      error={error}
      footer={
        <FooterLink label="New here? Create an account" onPress={() => router.replace(invitationId ? { pathname: '/create-account', params: { invitationId } } : '/create-account')} />
      }
    >
      <View style={[onboardingStyles.card, onboardingStyles.form]}>
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
          placeholder="Your password"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
      </View>
    </OnboardingShell>
  );
}
