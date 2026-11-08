import { Timestamp } from "firebase/firestore";
import { getFamily, getPet, getUsersById, petRef, userRef } from "@/lib/db";
import { dataVersionStore, selectedPetStore } from "@/lib/store";
import { sessionStore } from "@/lib/auth";
import { clearPendingInvitation } from "@/lib/pendingInvite";
import type { Invitation, Pet, User } from "@/types/firestore";
import { auth } from "@/lib/auth";
import {
  inviteMember,
  pendingInvitations,
  replaceInvitation,
  shareInvitation,
  acceptInvitation,
  previewInvitation,
} from "../../modelViews/invitationController";

export async function fetchPendingInvites(
  petId: string,
): Promise<Invitation[]> {
  const rows = await pendingInvitations(petId);
  return rows.map((row) => ({
    invitationId: row.invitationId,
    petId: petRef(petId),
    senderId: userRef(auth.currentUser?.uid ?? ""),
    toEmailAddress: row.toEmailAddress,
    deliveryStatus: "pending",
    acceptanceStatus: false,
    createdAt: Timestamp.fromMillis(row.createdAt ?? Date.now()),
    expiryDate: Timestamp.fromMillis(row.expiresAt ?? Date.now()),
    acceptedAt: null,
  }));
}
export type InviteResult =
  | { ok: true; token: string }
  | { ok: false; error: string };
export async function sendInvite(
  petId: string,
  senderId: string,
  email: string,
): Promise<InviteResult> {
  try {
    if (auth.currentUser?.uid !== senderId) throw new Error("Please sign in.");
    const created = await inviteMember(petId, email);
    await shareInvitation(created.token);
    return { ok: true, token: created.token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
export async function resendInvite(invitationId: string): Promise<void> {
  const created = await replaceInvitation(invitationId);
  await shareInvitation(created.token);
}
export type InviteState =
  | "pending"
  | "member"
  | "expired"
  | "wrongEmail"
  | "verifyEmail"
  | "signIn";
export type InviteDetails = {
  invitation: Invitation;
  pet: Pet;
  sender: User | null;
  family: User[];
  user: User | null;
  state: InviteState;
};
export async function fetchInviteDetails(
  token: string,
  userId: string,
): Promise<InviteDetails | null> {
  const info = await previewInvitation(token);
  if (!info) return null;
  const canReadFamily =
    !!auth.currentUser &&
    auth.currentUser.email?.trim().toLowerCase() === info.toEmailAddress;
  const [storedPet, family, users] = await Promise.all([
    canReadFamily
      ? getPet(info.petId).catch(() => null)
      : Promise.resolve(null),
    canReadFamily ? getFamily(info.petId).catch(() => []) : Promise.resolve([]),
    canReadFamily
      ? getUsersById([info.senderId, userId].filter(Boolean)).catch(
          () => ({}) as Record<string, User>,
        )
      : Promise.resolve({} as Record<string, User>),
  ]);
  // Public invitation preview is returned by the trusted callable function.
  const pet: Pet = storedPet ?? {
    petId: info.petId,
    name: info.petName,
    species: info.petSpecies,
    breed: null,
    gender: "Male",
    age: 0,
    birthday: null,
    petPhotoPath: null,
    weight: null,
    numberOfMembers: 0,
    totalPoints: 0,
    level: 1,
  };
  const user = users[userId] ?? null;
  const email = auth.currentUser?.email?.trim().toLowerCase();
  const state: InviteState =
    info.accepted || family.some((u) => u.userId === userId)
      ? "member"
      : info.revoked || info.expiresAt < Date.now()
        ? "expired"
        : !auth.currentUser
          ? "signIn"
          : email !== info.toEmailAddress
            ? "wrongEmail"
            : !auth.currentUser.emailVerified
              ? "verifyEmail"
              : "pending";
  return {
    invitation: {
      invitationId: token,
      petId: petRef(info.petId),
      senderId: userRef(info.senderId),
      toEmailAddress: "",
      deliveryStatus: "pending",
      acceptanceStatus: info.accepted,
      createdAt: Timestamp.fromMillis(info.createdAt),
      expiryDate: Timestamp.fromMillis(info.expiresAt),
      acceptedAt: null,
    },
    pet,
    family,
    sender: users[info.senderId] ?? null,
    user,
    state,
  };
}
export async function acceptInvite(
  invitation: Invitation,
  userId: string,
): Promise<void> {
  if (auth.currentUser?.uid !== userId)
    throw new Error("Sign in with the invited email.");
  const result = await acceptInvitation(invitation.invitationId);
  selectedPetStore.set(result.petId);
  await clearPendingInvitation();
  dataVersionStore.set(dataVersionStore.get() + 1);
  sessionStore.set("ready");
}
