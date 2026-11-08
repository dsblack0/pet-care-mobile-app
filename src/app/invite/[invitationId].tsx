import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarStack } from '@/components/challenges/AvatarStack';
import { getFaceSpec } from '@/components/pet/faceSpecs';
import { PetAvatar } from '@/components/pet/PetAvatar';
import { PetFace } from '@/components/pet/PetFace';
import { currentUserId, auth, resendVerificationEmail, refreshEmailVerification } from '@/lib/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { rememberInvitation, clearPendingInvitation } from '@/lib/pendingInvite';
import { signOut } from '@/lib/auth';
import { colors, fonts } from '@/constants/theme';
import { toDate } from '@/lib/homeData';
import { acceptInvite, fetchInviteDetails, type InviteDetails } from '@/lib/inviteData';
import { selectedPetStore } from '@/lib/store';
import type { Pet } from '@/types/firestore';

const WRONG_EMAIL_MESSAGE = 'This invitation cannot be used with your email. Please check your invitation or contact the person who sent it.';

/** "Milo is a 3-year-old Labrador." */
function petLine(pet: Pet): string {
  const kind = pet.breed ?? pet.species.toLowerCase();
  return pet.age > 0 ? `${pet.name} is a ${pet.age}-year-old ${kind}.` : `${pet.name} is a ${kind}.`;
}

function names(list: string[]): string {
  if (list.length <= 2) return list.join(' and ');
  return `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`;
}

export default function AcceptInviteScreen() {
  const { invitationId } = useLocalSearchParams<{ invitationId: string }>();
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRevision, setAuthRevision] = useState(0);

  useEffect(() => onAuthStateChanged(auth, () => setAuthRevision(n => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (invitationId) await rememberInvitation(invitationId);
        if (!auth.currentUser) {
          if (!cancelled) setDetails(null);
          return;
        }
        const d = await fetchInviteDetails(invitationId, auth.currentUser.uid);
        if (!cancelled) {
          if (d?.state === 'wrongEmail') {
            await clearPendingInvitation();
            await signOut();
            Alert.alert('Invitation unavailable', WRONG_EMAIL_MESSAGE, [{ text: 'OK', onPress: () => router.replace('/welcome') }]);
            router.replace('/welcome');
          } else setDetails(d);
        }
      } catch (e) {
        if (!cancelled) setError('This invitation is unavailable for this account.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invitationId, authRevision]);

  const goHome = (petId?: string) => {
    if (petId) selectedPetStore.set(petId);
    router.replace(petId ? '/' : '/welcome');
  };

  const join = async () => {
    if (!details) return;
    setJoining(true);
    setError(null);
    try {
      await acceptInvite(details.invitation, currentUserId());
      setJoined(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/different email|email does not match|invited email|cannot be used with/i.test(message)) {
        await clearPendingInvitation();
        await signOut();
        Alert.alert('Invitation unavailable', WRONG_EMAIL_MESSAGE);
        router.replace('/welcome');
        return;
      }
      setError(message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!details && (!auth.currentUser || !auth.currentUser.emailVerified)) {
    return <Frame hero={<IconHero name="mail-unread-outline" />} title={auth.currentUser ? "Verify your email to continue" : "Sign in to open this invitation"}
      subtitle="Only the account with the verified invited email can view or accept this invitation."
      button={{ label: auth.currentUser ? "I've verified my email" : "Sign in", onPress: () => { if (auth.currentUser) { void refreshEmailVerification().then(() => setAuthRevision(n => n + 1)); } else router.push('/sign-in'); } }}
      secondary={auth.currentUser ? { label: "Resend verification email", onPress: () => { void resendVerificationEmail().catch(e => setError(String(e))); } } : undefined} error={error} />;
  }
  if (!details) {
    return (
      <Frame
        hero={<IconHero name="mail-unread-outline" />}
        title="We couldn’t find this invite"
        subtitle={error ?? 'The link may be wrong, or the invite was removed.'}
        button={{ label: 'Return to welcome', onPress: () => { void (async () => { await clearPendingInvitation(); await signOut(); router.replace('/welcome'); })(); } }}
      />
    );
  }

  const { pet, sender, family, invitation, user } = details;
  const senderName = sender?.name.split(' ')[0] ?? 'Someone';

  if (joined || details.state === 'member') {
    return (
      <Frame
        hero={<HappyFace pet={pet} />}
        kicker={joined ? 'YOU’RE IN' : undefined}
        title={joined ? `Welcome to ${pet.name}’s family!` : `You’re already in ${pet.name}’s family`}
        subtitle={
          joined
            ? `You can now log care, join challenges and add memories with ${names(
                family.map((u) => u.name.split(' ')[0]),
              )}.`
            : `Head to ${pet.name}’s home to see what’s happening today.`
        }
        button={{ label: `Go to ${pet.name}’s home`, onPress: () => goHome(pet.petId) }}
      />
    );
  }

  if (details.state === 'expired') {
    return (
      <Frame
        hero={<PetHero pet={pet} />}
        title="This invite has expired"
        subtitle={`Invites last 7 days. Ask ${senderName} to send you a new one.`}
        button={{ label: 'Go home', onPress: () => goHome() }}
      />
    );
  }

  if (details.state === 'signIn' || details.state === 'verifyEmail') {
    return (
      <Frame
        hero={<PetHero pet={pet} />}
        title={details.state === 'signIn' ? 'Sign in to accept your invitation' : 'Verify your email first'}
        subtitle={details.state === 'signIn' ? 'Sign in or create an account using the email address that received this invitation.' : 'Verify your account email using the message from Firebase, then return here.'}
        button={{ label: details.state === 'signIn' ? 'Sign in' : 'Resend verification email', onPress: () => {
          if (details.state === 'signIn') router.push('/sign-in');
          else void refreshEmailVerification().then(() => setAuthRevision(n => n + 1)).catch(e => setError(String(e)));
        } }}
      />
    );
  }

  if (details.state === 'wrongEmail') {
    return (
      <Frame
        hero={<PetHero pet={pet} />}
        title="This invite is for someone else"
        subtitle={WRONG_EMAIL_MESSAGE}
        button={{ label: 'Return to welcome', onPress: () => { void (async () => { await clearPendingInvitation(); await signOut(); router.replace('/welcome'); })(); } }}
      />
    );
  }

  const expires = toDate(invitation.expiryDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Frame
      hero={<PetHero pet={pet} />}
      kicker="FAMILY INVITE"
      title={`${senderName} invited you to join ${pet.name}’s family`}
      subtitle={petLine(pet)}
      error={error}
      button={{
        label: joining ? 'Joining…' : `Join ${pet.name}’s family`,
        onPress: join,
        disabled: joining,
      }}
      secondary={{ label: 'Not now', onPress: () => goHome() }}
      footnote={`Invite expires ${expires}`}
    >
      {family.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Already in the family</Text>
          <View style={styles.familyRow}>
            <AvatarStack names={family.map((u) => u.name)} size={36} />
            <Text style={styles.familyNames}>{names(family.map((u) => u.name.split(' ')[0]))}</Text>
          </View>
        </View>
      )}
    </Frame>
  );
}

type Button = { label: string; onPress: () => void; disabled?: boolean };

/** Shared layout for every state: close, hero, title, optional content, buttons at the bottom. */
function Frame({
  hero,
  kicker,
  title,
  subtitle,
  children,
  error,
  button,
  secondary,
  footnote,
}: {
  hero: ReactNode;
  kicker?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  error?: string | null;
  button: Button;
  secondary?: Button;
  footnote?: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.close}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>{hero}</View>
        <View style={styles.heading}>
          {kicker && <Text style={styles.kicker}>{kicker}</Text>}
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>
      <View style={styles.footer}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.button, button.disabled && styles.buttonDisabled]}
          onPress={button.onPress}
          disabled={button.disabled}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{button.label}</Text>
        </Pressable>
        {secondary && (
          <Pressable onPress={secondary.onPress} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>{secondary.label}</Text>
          </Pressable>
        )}
        {footnote && <Text style={styles.footnote}>{footnote}</Text>}
      </View>
    </SafeAreaView>
  );
}

function PetHero({ pet }: { pet: Pet }) {
  return (
    <View>
      <View style={[styles.halo, { backgroundColor: getFaceSpec(pet.species).halo }]}>
        <PetAvatar pet={pet} size={128} />
      </View>
      <View style={styles.badge}>
        <Ionicons name="mail" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

function HappyFace({ pet }: { pet: Pet }) {
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);
  return (
    <View style={[styles.halo, { backgroundColor: getFaceSpec(pet.species).halo }]}>
      <PetFace species={pet.species} mood="happy" size={130} scrollY={scrollY} atBottom={atBottom} />
    </View>
  );
}

function IconHero({ name }: { name: 'mail-unread-outline' }) {
  return (
    <View style={[styles.halo, { backgroundColor: colors.peach }]}>
      <Ionicons name={name} size={56} color={colors.openText} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 16, paddingTop: 8, minHeight: 48 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 8, gap: 24, paddingBottom: 32 },
  hero: { alignItems: 'center' },
  halo: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { gap: 8, alignItems: 'center' },
  kicker: { fontSize: 12, letterSpacing: 1, fontFamily: fonts.heading, color: colors.primary },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  cardLabel: { fontSize: 13, fontFamily: fonts.subheading, color: colors.textMuted },
  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  familyNames: { flex: 1, fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  error: { fontSize: 14, color: colors.openText, textAlign: 'center' },
  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },
  link: { fontSize: 15, fontFamily: fonts.subheading, color: colors.primary, textAlign: 'center' },
  footnote: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
