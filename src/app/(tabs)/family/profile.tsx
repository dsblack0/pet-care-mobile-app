import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile, verifyBeforeUpdateEmail } from "firebase/auth";
import { auth } from "@/lib/auth";
import { db } from "../../../../firebaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeHeader } from "@/components/home/HomeHeader";
import { SectionHeader } from "@/components/log/SectionHeader";
import { PetAvatar } from "@/components/pet/PetAvatar";
import { currentUserId, signOut } from "@/lib/auth";
import { colors, fonts } from "@/constants/theme";
import { initial } from "@/lib/format";
import { usePets } from "@/hooks/usePets";
import {
  fetchProfile,
  type ProfileData,
  type ProfilePet,
} from "@/lib/profileData";
import {
  getChallengeSettings,
  setChallengeSettings,
  type FamilyPlan,
} from "@/lib/challengePlans";
import { createFreePresetChallenges } from "@/lib/weeklyChallenges";
import { useImageUrl } from "@/lib/storage";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import type { User } from "@/types/firestore";

export default function ProfileScreen() {
  const [familyPlan, setFamilyPlan] = useState<FamilyPlan>("free");
  const [planSaving, setPlanSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedNotifications, setEditedNotifications] = useState({
    email: false,
    text: false,
    push: false,
  });
  const [saving, setSaving] = useState(false);
  const saveProfile = async () => {
    const name = editedName.trim();
    const email = editedEmail.trim().toLowerCase();
    if (!name || !email || saving) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Check your email", "Enter a valid email address.");
      return;
    }
    const account = auth.currentUser;
    if (!account) {
      Alert.alert(
        "Sign in required",
        "Sign in to save changes to your account.",
      );
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", account.uid),
        {
          name,
          notifications: editedNotifications,
        },
        { merge: true },
      );
      await updateProfile(account, { displayName: name });
      const emailChanged = email !== (account.email ?? "").toLowerCase();
      let verificationSent = false;
      if (emailChanged) {
        try {
          await verifyBeforeUpdateEmail(account, email);
          verificationSent = true;
        } catch {
          Alert.alert(
            "Profile saved",
            "Your name and notification preferences were saved, but we could not start the email change. Please sign in again and retry.",
          );
        }
      }
      setProfile((old) =>
        old
          ? {
              ...old,
              user: { ...old.user, name, notifications: editedNotifications },
            }
          : old,
      );
      setEditing(false);
      dataVersionStore.set(dataVersionStore.get() + 1);
      if (verificationSent) {
        Alert.alert(
          "Check your inbox",
          "We sent a confirmation link to your new email address. Your sign-in email will change after you confirm it.",
        );
      } else if (!emailChanged) {
        Alert.alert("Saved", "Your account details have been updated.");
      }
    } catch {
      Alert.alert(
        "Could not save",
        "Your changes could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const dataVersion = dataVersionStore.useValue();

  const { pets, pet } = usePets();

  useEffect(() => {
    (async () => setProfile(await fetchProfile(currentUserId())))();
  }, [dataVersion]);

  useEffect(() => {
    if (pet?.petId)
      void getChallengeSettings(pet.petId)
        .then((s) => setFamilyPlan(s.plan))
        .catch(console.warn);
  }, [pet?.petId, dataVersion]);
  const switchPlan = async (plan: FamilyPlan) => {
    if (!pet?.petId || planSaving) return;
    setPlanSaving(true);
    try {
      await setChallengeSettings(pet.petId, { plan });
      setFamilyPlan(plan);
      if (plan === "free") await createFreePresetChallenges(pet.petId);
    } catch (e) {
      Alert.alert(
        "Could not update plan",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setPlanSaving(false);
    }
  };
  const role = profile?.isOrganizer ? "Family organizer" : "Family member";
  const petCount = profile?.pets.length ?? 0;
  const petCountLabel = `${petCount} pet${petCount === 1 ? "" : "s"}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        eyebrow="User Profile"
        compact
      />
      <Modal
        visible={editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.userName}>Edit account information</Text>
            <TextInput
              accessibilityLabel="Full name"
              value={editedName}
              onChangeText={setEditedName}
              style={styles.nameInput}
              autoCapitalize="words"
            />
            <Text style={styles.muted}>Email address</Text>
            <TextInput
              accessibilityLabel="Email address"
              value={editedEmail}
              onChangeText={setEditedEmail}
              style={styles.nameInput}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Text style={styles.muted}>Notification preferences</Text>
            {(["email", "text", "push"] as const).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: editedNotifications[key] }}
                onPress={() =>
                  setEditedNotifications((old) => ({
                    ...old,
                    [key]: !old[key],
                  }))
                }
                style={styles.preferenceRow}
              >
                <Ionicons
                  name={
                    editedNotifications[key] ? "checkbox" : "square-outline"
                  }
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.settingsText}>
                  {key === "email"
                    ? "Email"
                    : key === "text"
                      ? "Text messages"
                      : "Push notifications"}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.muted}>
              Notification delivery is not enabled in this test build. Your
              choices will be saved for later.
            </Text>
            <Pressable
              onPress={() => void saveProfile()}
              disabled={saving || !editedName.trim()}
              style={styles.modalButton}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setEditing(false)}>
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
                  <Text style={[styles.tag, styles.tagGreen]}>
                    {petCountLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View>
            <View style={styles.sectionRow}>
              <SectionHeader title="Personal account information" />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setEditedName(profile.user.name);
                  setEditedEmail(profile.user.email);
                  setEditedNotifications({
                    email: !!profile.user.notifications?.email,
                    text: !!profile.user.notifications?.text,
                    push: !!profile.user.notifications?.push,
                  });
                  setEditing(true);
                }}
              >
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.card}>
              <InfoRow label="Full name" value={profile.user.name} />
              <InfoRow label="Email address" value={profile.user.email} />
              <InfoRow label="Account role" value={role} />
              <InfoRow
                label="Notifications"
                value={notificationsLabel(profile.user)}
              />
              <InfoRow
                label="Member since"
                value={profile.user.joinedAt
                  .toDate()
                  .toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                last
              />
            </View>
          </View>

          <View>
            <SectionHeader
              title="Family challenge plan"
              hint={pet?.name ?? ""}
            />
            <View style={styles.card}>
              <Text style={styles.muted}>
                Demo plan selection — no payment is collected. The plan is
                shared by everyone caring for this pet.
              </Text>
              {(["free", "plus"] as const).map((plan) => (
                <Pressable
                  key={plan}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: familyPlan === plan }}
                  disabled={planSaving || !pet}
                  onPress={() => void switchPlan(plan)}
                  style={styles.preferenceRow}
                >
                  <Ionicons
                    name={
                      familyPlan === plan
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.settingsText}>
                    {plan === "free"
                      ? "Free — preset challenges"
                      : "Pawmily Plus — Apple AI challenges"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <SectionHeader title="Your pets" hint={petCountLabel} />
            <View style={styles.card}>
              {profile.pets.map((p, i) => (
                <PetRow
                  key={p.pet.petId}
                  item={p}
                  last={i === profile.pets.length - 1}
                />
              ))}
            </View>
          </View>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/family/add-pet")}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>Add another pet</Text>
          </Pressable>

          <View style={[styles.card, styles.settingsRow]}>
            <Ionicons name="settings" size={20} color={colors.primary} />
            <Text style={styles.settingsText}>Account Settings & Privacy</Text>
          </View>

          <Pressable
            style={[styles.card, styles.settingsRow]}
            onPress={signOut}
            accessibilityRole="button"
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.openText}
            />
            <Text style={styles.settingsText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function notificationsLabel(user: User): string {
  const on = (["Email", "Text", "Push"] as const).filter(
    (k) => user.notifications?.[k.toLowerCase() as "email" | "text" | "push"],
  );
  if (on.length === 0) return "Off";
  return on.map((k, i) => (i === 0 ? k : k.toLowerCase())).join(" & ");
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
      {chevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </View>
  );
}

function PetRow({ item, last }: { item: ProfilePet; last: boolean }) {
  const { pet, level, sharedWith } = item;
  const details = [pet.breed, `${pet.age} year${pet.age === 1 ? "" : "s"}`];
  if (pet.weight) details.push(`${pet.weight} lb`);
  const extra = [
    level ? `${level.title} · Level ${pet.level}` : `Level ${pet.level}`,
  ];
  if (sharedWith.length) extra.push(`Shared with ${sharedWith.join(" + ")}`);

  return (
    <View style={[styles.petRow, !last && styles.divider]}>
      <PetAvatar pet={pet} />
      <View style={styles.petText}>
        <Text style={styles.petName}>
          {pet.name} <Text style={styles.species}>{pet.species}</Text>
        </Text>
        <Text style={styles.petLine}>
          {details.filter(Boolean).join(" · ")}
        </Text>
        <Text style={styles.petSubLine}>{extra.join(" · ")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "center",
    padding: 24,
  },
  modalPanel: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 20,
    gap: 16,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  content: { padding: 20, paddingTop: 12, gap: 24, paddingBottom: 40 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between" },
  link: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.primary,
    marginTop: 4,
  },
  muted: { fontSize: 14, color: colors.textMuted },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  userPhoto: { width: 84, height: 84, borderRadius: 24 },
  userInitial: {
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  userInitialText: {
    fontSize: 34,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  profileText: { flex: 1, gap: 4 },
  userName: { fontSize: 26, fontFamily: fonts.heading, color: colors.text },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  tagPurple: { backgroundColor: colors.primarySoft, color: colors.primary },
  tagGreen: { backgroundColor: colors.mint, color: "#3F8A57" },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { width: 112, fontSize: 13, color: colors.textMuted },
  infoValue: { flex: 1, fontSize: 15, color: colors.text },

  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  petText: { flex: 1, gap: 2 },
  petName: { fontSize: 17, fontFamily: fonts.heading, color: colors.text },
  species: { fontSize: 12, fontFamily: undefined, color: colors.textMuted },
  petLine: { fontSize: 13, color: colors.text },
  petSubLine: { fontSize: 13, color: colors.textMuted },

  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: "#FFFFFF" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.text,
  },
});
