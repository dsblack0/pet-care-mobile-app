import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/HomeHeader';
import { SectionHeader } from '@/components/log/SectionHeader';
import { PetAvatar } from '@/components/pet/PetAvatar';
import { CURRENT_USER_ID } from '@/constants/session';
import { colors, fonts } from '@/constants/theme';
import { initial } from '@/lib/format';
import { usePets } from '@/hooks/usePets';
import { fetchProfile, type ProfileData, type ProfilePet } from '@/lib/profileData';
import { useImageUrl } from '@/lib/storage';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { User } from '@/types/firestore';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const dataVersion = dataVersionStore.useValue();

  const { pets, pet } = usePets();

  useEffect(() => {
    (async () => setProfile(await fetchProfile(CURRENT_USER_ID)))();
  }, [dataVersion]);

  const role = profile?.isOrganizer ? 'Family organizer' : 'Family member';
  const petCount = profile?.pets.length ?? 0;
  const petCountLabel = `${petCount} pet${petCount === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        eyebrow="User Profile"
        compact
      />
      {profile && (
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <SectionHeader title="Your Profile" />
            <View style={[styles.card, styles.profileCard]}>
              <UserAvatar user={profile.user} />
              <View style={styles.profileText}>
                <Text style={styles.userName}>{profile.user.name}</Text>
                <Text style={styles.muted}>{profile.user.email}</Text>
                <View style={styles.tags}>
                  <Text style={[styles.tag, styles.tagPurple]}>{role}</Text>
                  <Text style={[styles.tag, styles.tagGreen]}>{petCountLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View>
            <View style={styles.sectionRow}>
              <SectionHeader title="Personal account information" />
              <Text style={styles.link}>Edit</Text>
            </View>
            <View style={styles.card}>
              <InfoRow label="Full name" value={profile.user.name} />
              <InfoRow label="Email address" value={profile.user.email} />
              <InfoRow label="Account role" value={role} />
              <InfoRow label="Notifications" value={notificationsLabel(profile.user)} chevron />
              <InfoRow
                label="Member since"
                value={profile.user.joinedAt
                  .toDate()
                  .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                last
              />
            </View>
          </View>

          <View>
            <SectionHeader title="Your pets" hint={petCountLabel} />
            <View style={styles.card}>
              {profile.pets.map((p, i) => (
                <PetRow key={p.pet.petId} item={p} last={i === profile.pets.length - 1} />
              ))}
            </View>
          </View>

          <Pressable
            style={styles.button}
            onPress={() => router.push('/family/add-pet')}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>Add another pet</Text>
          </Pressable>

          <Pressable style={[styles.card, styles.settingsRow]} accessibilityRole="button">
            <Ionicons name="settings" size={20} color={colors.primary} />
            <Text style={styles.settingsText}>Account Settings & Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function notificationsLabel(user: User): string {
  const on = (['Email', 'Text', 'Push'] as const).filter(
    (k) => user.notifications[k.toLowerCase() as 'email' | 'text' | 'push'],
  );
  if (on.length === 0) return 'Off';
  return on.map((k, i) => (i === 0 ? k : k.toLowerCase())).join(' & ');
}

function UserAvatar({ user }: { user: User }) {
  const url = useImageUrl(user.profilePhotoPath);
  return url ? (
    <Image source={{ uri: url }} style={styles.userPhoto} />
  ) : (
    <View style={[styles.userPhoto, styles.userInitial]}>
      <Text style={styles.userInitialText}>{initial(user.name)}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  chevron,
  last,
}: {
  label: string;
  value: string;
  chevron?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.divider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
      {chevron && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </View>
  );
}

function PetRow({ item, last }: { item: ProfilePet; last: boolean }) {
  const { pet, level, sharedWith } = item;
  const details = [pet.breed, `${pet.age} year${pet.age === 1 ? '' : 's'}`];
  if (pet.weight) details.push(`${pet.weight} lb`);
  const extra = [level ? `${level.title} · Level ${pet.level}` : `Level ${pet.level}`];
  if (sharedWith.length) extra.push(`Shared with ${sharedWith.join(' + ')}`);

  return (
    <Pressable style={[styles.petRow, !last && styles.divider]} accessibilityRole="button">
      <PetAvatar pet={pet} />
      <View style={styles.petText}>
        <Text style={styles.petName}>
          {pet.name} <Text style={styles.species}>{pet.species}</Text>
        </Text>
        <Text style={styles.petLine}>{details.filter(Boolean).join(' · ')}</Text>
        <Text style={styles.petSubLine}>{extra.join(' · ')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 12, gap: 24, paddingBottom: 40 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { fontSize: 14, fontFamily: fonts.subheading, color: colors.primary, marginTop: 4 },
  muted: { fontSize: 14, color: colors.textMuted },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  userPhoto: { width: 84, height: 84, borderRadius: 24 },
  userInitial: { backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  userInitialText: { fontSize: 34, fontFamily: fonts.heading, color: colors.text },
  profileText: { flex: 1, gap: 4 },
  userName: { fontSize: 26, fontFamily: fonts.heading, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tagPurple: { backgroundColor: colors.primarySoft, color: colors.primary },
  tagGreen: { backgroundColor: colors.mint, color: '#3F8A57' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  infoLabel: { width: 112, fontSize: 13, color: colors.textMuted },
  infoValue: { flex: 1, fontSize: 15, color: colors.text },

  petRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  petText: { flex: 1, gap: 2 },
  petName: { fontSize: 17, fontFamily: fonts.heading, color: colors.text },
  species: { fontSize: 12, fontFamily: undefined, color: colors.textMuted },
  petLine: { fontSize: 13, color: colors.text },
  petSubLine: { fontSize: 13, color: colors.textMuted },

  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  settingsText: { flex: 1, fontSize: 16, fontFamily: fonts.subheading, color: colors.text },
});
