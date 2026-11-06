import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fieldStyles } from '@/components/form/fieldStyles';
import { SectionHeader } from '@/components/log/SectionHeader';
import { OnboardingShell, onboardingStyles } from '@/components/onboarding/OnboardingShell';
import { colors, fonts } from '@/constants/theme';
import { currentUserId } from '@/lib/auth';
import { sendInvite } from '@/lib/inviteData';
import { onboardingStore } from '@/lib/onboardingData';

export default function OnboardingFamilyScreen() {
  const { petId, petName } = onboardingStore.useValue();
  const [email, setEmail] = useState('');
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const invite = async () => {
    if (!petId || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendInvite(petId, currentUserId(), email);
      if (result.ok) {
        setInvited((list) => [...list, email.trim().toLowerCase()]);
        setEmail('');
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      canGoBack={false}
      title={`Who else helps with ${petName || 'your pet'}?`}
      subtitle="Invite the people who share the care. Challenges work best when everyone can join in."
      buttonLabel={invited.length ? 'Continue' : 'Skip for now'}
      onPress={() => router.push('/focus')}
      error={error}
    >
      <View style={onboardingStyles.card}>
        <Text style={fieldStyles.label}>Family member’s email</Text>
        <View style={styles.inviteRow}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onSubmitEditing={invite}
            style={[fieldStyles.box, fieldStyles.inputText, styles.input]}
          />
          <Pressable
            style={[styles.inviteButton, (!email.trim() || sending) && styles.disabled]}
            onPress={invite}
            disabled={!email.trim() || sending}
            accessibilityRole="button"
          >
            <Text style={styles.inviteText}>{sending ? '…' : 'Invite'}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>They’ll get an invite that lasts 7 days.</Text>
      </View>

      {invited.length > 0 && (
        <View>
          <SectionHeader title="Invited" hint={`${invited.length}`} />
          <View style={[onboardingStyles.card, styles.list]}>
            {invited.map((address) => (
              <View key={address} style={styles.invitedRow}>
                <View style={styles.check}>
                  <Ionicons name="paper-plane" size={16} color={colors.primary} />
                </View>
                <Text style={styles.address} numberOfLines={1}>
                  {address}
                </Text>
                <Text style={styles.pending}>Pending</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  inviteRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, minWidth: 0 },
  inviteButton: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  inviteText: { fontSize: 15, fontFamily: fonts.heading, color: '#FFFFFF' },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  list: { gap: 12 },
  invitedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: { flex: 1, fontSize: 15, color: colors.text },
  pending: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: colors.openText,
    backgroundColor: colors.openBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
