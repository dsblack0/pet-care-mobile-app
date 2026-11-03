import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/HomeHeader';
import { SectionHeader } from '@/components/log/SectionHeader';
import { CURRENT_USER_ID } from '@/constants/session';
import { colors, fonts } from '@/constants/theme';
import { daysLeft } from '@/lib/format';
import { usePets } from '@/hooks/usePets';
import { fetchPendingInvites, resendInvite, sendInvite } from '@/lib/inviteData';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { Invitation } from '@/types/firestore';

export default function InviteScreen() {
  const [pending, setPending] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState<string[]>([]);

  const dataVersion = dataVersionStore.useValue();
  const { pets, pet } = usePets();
  const petId = pet?.petId;

  useEffect(() => {
    if (!petId) return;
    (async () => setPending(await fetchPendingInvites(petId)))();
  }, [petId, dataVersion]);

  const selectPet = (id: string) => {
    selectedPetStore.set(id);
    setError(null);
    setSentTo(null);
    setResent([]);
  };

  const send = async () => {
    if (!pet || sending) return;
    setSending(true);
    setError(null);
    setSentTo(null);
    const result = await sendInvite(pet.petId, CURRENT_USER_ID, email);
    setSending(false);
    if (result.ok) {
      setSentTo(email.trim());
      setEmail('');
    } else {
      setError(result.error);
    }
  };

  const resend = async (id: string) => {
    await resendInvite(id);
    setResent((cur) => [...cur, id]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={selectPet}
        eyebrow="Invite Family Member"
        compact
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <SectionHeader title="Who would you like to invite?" />
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.input, error && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={send}
                style={styles.inputText}
              />
            </View>
            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : sentTo ? (
              <Text style={styles.success}>Invite sent to {sentTo}.</Text>
            ) : (
              <Text style={styles.helper}>
                We&apos;ll email a secure invitation. It expires in 7 days.
              </Text>
            )}

            <Pressable
              style={[styles.button, (!email.trim() || sending) && styles.buttonDisabled]}
              onPress={send}
              disabled={!email.trim() || sending}
              accessibilityRole="button"
            >
              <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                Send invite to {pet?.name ?? 'your'}&apos;s Family
              </Text>
            </Pressable>
          </View>

          <View>
            <SectionHeader title="Pending invitations" hint={`${pending.length} pending`} />
            <View style={styles.card}>
              {pending.length === 0 && <Text style={styles.empty}>No pending invitations.</Text>}
              {pending.map((inv, i) => {
                const wasResent = resent.includes(inv.invitationId);
                const left = daysLeft(inv.expiryDate.toDate());
                return (
                  <View
                    key={inv.invitationId}
                    style={[styles.row, i < pending.length - 1 && styles.divider]}
                  >
                    <View style={styles.mailIcon}>
                      <Ionicons name="mail-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.email} numberOfLines={1}>
                        {inv.toEmailAddress}
                      </Text>
                      <Text style={styles.meta}>
                        Sent{' '}
                        {inv.createdAt
                          .toDate()
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                        · expires in {left} {left === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => resend(inv.invitationId)}
                      disabled={wasResent}
                      accessibilityRole="button"
                      accessibilityLabel={`Resend invite to ${inv.toEmailAddress}`}
                    >
                      <Text style={[styles.resend, wasResent && styles.resendDone]}>
                        {wasResent ? 'Resent' : 'Resend'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 12, gap: 28, paddingBottom: 40 },
  form: { gap: 8 },
  label: { fontSize: 15, fontFamily: fonts.subheading, color: colors.text, marginTop: -4 },
  input: {
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: { borderColor: colors.openText },
  inputText: { flex: 1, fontSize: 16, color: colors.text },
  helper: { fontSize: 14, color: colors.textMuted },
  error: { fontSize: 14, color: colors.openText },
  success: { fontSize: 14, fontFamily: fonts.subheading, color: colors.doneText },
  button: {
    marginTop: 12,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  empty: { fontSize: 14, color: colors.textMuted, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  mailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  resend: { fontSize: 15, fontFamily: fonts.subheading, color: colors.primary },
  resendDone: { color: colors.textMuted },
});
