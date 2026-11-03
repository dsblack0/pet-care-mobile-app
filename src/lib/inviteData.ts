// Data for the Invite Family Member screen. Invitations are built with the team's
// models/invitations; the save is mock-backed like the other data files.
import { collection, doc, Timestamp } from 'firebase/firestore';

import * as mock from '@/data/mockData';
import { dataVersionStore } from '@/lib/store';
import type { Invitation } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import { getPetReference, getUserReference } from '../../firebaseServices/nudgesService';
import { createInvitation } from '../../models/invitations';

const EXPIRY_DAYS = 7;

/** Not yet accepted and not expired, newest first. */
export async function fetchPendingInvites(petId: string): Promise<Invitation[]> {
  const now = Date.now();
  return mock.invitations
    .filter((i) => i.petId.id === petId && !i.acceptanceStatus && i.expiryDate.toMillis() > now)
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

  const memberIds = mock.userPets.filter((up) => up.petId.id === petId).map((up) => up.userId.id);
  if (mock.users.some((u) => memberIds.includes(u.userId) && u.email.toLowerCase() === address)) {
    return { ok: false, error: 'This person is already in the family.' };
  }
  if ((await fetchPendingInvites(petId)).some((i) => i.toEmailAddress === address)) {
    return { ok: false, error: 'An invite to this email is already pending.' };
  }

  const invitationId = doc(collection(db, 'invitations')).id;
  const invite = createInvitation(getPetReference(petId), getUserReference(senderId), address);
  mock.invitations.push({ invitationId, ...invite });
  dataVersionStore.set(dataVersionStore.get() + 1);
  return { ok: true };
}

/** Restart the 7-day window on a pending invite. */
export async function resendInvite(invitationId: string): Promise<void> {
  const invite = mock.invitations.find((i) => i.invitationId === invitationId);
  if (!invite) return;
  const now = Timestamp.now();
  invite.createdAt = now;
  invite.expiryDate = Timestamp.fromMillis(now.toMillis() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  invite.deliveryStatus = 'pending';
  dataVersionStore.set(dataVersionStore.get() + 1);
}
