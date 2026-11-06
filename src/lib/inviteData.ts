// Data for the Invite Family Member screen, backed by Firestore. Invitations are built with the
// team's models/invitations.
import { addDoc, collection, doc, Timestamp, updateDoc } from 'firebase/firestore';

import { getFamily, getInvitationsForPet, petRef, userRef } from '@/lib/db';
import { dataVersionStore } from '@/lib/store';
import type { Invitation } from '@/types/firestore';
import { db } from '../../firebaseConfig';
import { createInvitation } from '../../models/invitations';

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
