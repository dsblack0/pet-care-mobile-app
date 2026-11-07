// Data for the Invite Family Member and Accept Invite screens, backed by Firestore. Invitations are built with the
// team's models/invitations.
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import { getFamily, getInvitationsForPet, getPet, getUsersById, petRef, userRef } from '@/lib/db';
import { dataVersionStore, selectedPetStore } from '@/lib/store';
import type { Invitation, Pet, User } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import { saveUserPet } from '../../firebaseServices/userPetsService';
import { createInvitation } from '../../models/invitations';
import { createUserPet } from '../../models/userPets';

const EXPIRY_DAYS = 7;

/** Not yet accepted and not expired, newest first. */
export async function fetchPendingInvites(petId: string): Promise<Invitation[]> {
  const now = Date.now();
  return (await getInvitationsForPet(petId))
    .filter((i) => !i.acceptanceStatus && i.expiryDate.toMillis() > now)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export type InviteResult = { ok: true } | { ok: false; error: string };

export async function sendInvite(
  petId: string,
  senderId: string,
  email: string,
): Promise<InviteResult> {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if ((await getFamily(petId)).some((u) => u.email.toLowerCase() === address)) {
    return { ok: false, error: 'This person is already in the family.' };
  }
  if ((await fetchPendingInvites(petId)).some((i) => i.toEmailAddress === address)) {
    return { ok: false, error: 'An invite to this email is already pending.' };
  }

  // firebaseServices/invitationsService has no .ts extension, so it can't be imported yet.
  await addDoc(
    collection(db, 'invitations'),
    createInvitation(petRef(petId), userRef(senderId), address),
  );
  dataVersionStore.set(dataVersionStore.get() + 1);
  return { ok: true };
}

/** Restart the 7-day window on a pending invite. */
export async function resendInvite(invitationId: string): Promise<void> {
  const now = Timestamp.now();
  await updateDoc(doc(db, 'invitations', invitationId), {
    createdAt: now,
    expiryDate: Timestamp.fromMillis(now.toMillis() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    deliveryStatus: 'pending',
  });
  dataVersionStore.set(dataVersionStore.get() + 1);
}

export type InviteState =
  | 'pending'
  /** Already accepted, or the user is already in this pet's family. */
  | 'member'
  | 'expired'
  /** Sent to a different email than the user's. */
  | 'wrongEmail';

export type InviteDetails = {
  invitation: Invitation;
  pet: Pet;
  sender: User | null;
  family: User[];
  user: User | null;
  state: InviteState;
};

/** Everything the accept-invite screen shows. null if the invitation or its pet is gone. */
export async function fetchInviteDetails(
  invitationId: string,
  userId: string,
): Promise<InviteDetails | null> {
  const snap = await getDoc(doc(db, 'invitations', invitationId));
  if (!snap.exists()) return null;
  const invitation = { ...(snap.data() as Omit<Invitation, 'invitationId'>), invitationId };

  const [pet, family, users] = await Promise.all([
    getPet(invitation.petId.id),
    getFamily(invitation.petId.id),
    getUsersById([invitation.senderId.id, userId]),
  ]);
  if (!pet) return null;

  const user = users[userId] ?? null;
  const state: InviteState =
    invitation.acceptanceStatus || family.some((u) => u.userId === userId)
      ? 'member'
      : invitation.expiryDate.toMillis() < Date.now()
        ? 'expired'
        : user && user.email.toLowerCase() !== invitation.toEmailAddress.toLowerCase()
          ? 'wrongEmail'
          : 'pending';

  return { invitation, pet, sender: users[invitation.senderId.id] ?? null, family, user, state };
}

/** Accept: mark the invitation accepted and add the user to the pet's family as a member. */
export async function acceptInvite(invitation: Invitation, userId: string): Promise<void> {
  const petId = invitation.petId.id;
  await updateDoc(doc(db, 'invitations', invitation.invitationId), {
    acceptanceStatus: true,
    acceptedAt: Timestamp.now(),
  });
  await saveUserPet(createUserPet(userRef(userId), petRef(petId), 'member'));
  await Promise.all([
    updateDoc(petRef(petId), { numberOfMembers: increment(1) }),
    updateDoc(userRef(userId), { numberOfPets: increment(1) }),
  ]);
  selectedPetStore.set(petId);
  dataVersionStore.set(dataVersionStore.get() + 1);
}
