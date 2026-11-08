import { Timestamp } from 'firebase/firestore';
import { getFamily, getPet, getUsersById, petRef, userRef } from '@/lib/db';
import { selectedPetStore } from '@/lib/store';
import type { Invitation, Pet, User } from '@/types/firestore';
import { auth } from '@/lib/auth';
import { inviteMember, pendingInvitations, replaceInvitation, shareInvitation, acceptInvitation, previewInvitation } from '../../modelViews/invitationController';

export async function fetchPendingInvites(petId: string): Promise<Invitation[]> {
  const rows = await pendingInvitations(petId);
  return rows.map(row => ({ invitationId: row.invitationId, petId: petRef(petId),
    senderId: userRef(auth.currentUser?.uid ?? ''), toEmailAddress: row.toEmailAddress,
    deliveryStatus: 'pending', acceptanceStatus: false,
    createdAt: Timestamp.fromMillis(row.createdAt ?? Date.now()),
    expiryDate: Timestamp.fromMillis(row.expiresAt ?? Date.now()), acceptedAt: null }));
}
export type InviteResult = { ok: true } | { ok: false; error: string };
export async function sendInvite(petId: string, senderId: string, email: string): Promise<InviteResult> {
  try {
    if (auth.currentUser?.uid !== senderId) throw new Error('Please sign in.');
    const created = await inviteMember(petId, email);
    await shareInvitation(created.token);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
export async function resendInvite(invitationId: string): Promise<void> {
  const created = await replaceInvitation(invitationId);
  await shareInvitation(created.token);
}
export type InviteState = 'pending' | 'member' | 'expired' | 'wrongEmail' | 'verifyEmail' | 'signIn';
export type InviteDetails = { invitation: Invitation; pet: Pet; sender: User | null; family: User[]; user: User | null; state: InviteState };
export async function fetchInviteDetails(token: string, userId: string): Promise<InviteDetails | null> {
  const info = await previewInvitation(token);
  if (!info) return null;
  const [pet, family, users] = await Promise.all([
    getPet(info.petId), getFamily(info.petId), getUsersById([info.senderId, userId].filter(Boolean)),
  ]);
  if (!pet) return null;
  const user = users[userId] ?? null;
  const email = auth.currentUser?.email?.trim().toLowerCase();
  const state: InviteState = info.accepted || family.some(u => u.userId === userId) ? 'member'
    : info.revoked || info.expiresAt < Date.now() ? 'expired'
    : !auth.currentUser ? 'signIn'
    : email !== info.toEmailAddress ? 'wrongEmail'
    : !auth.currentUser.emailVerified ? 'verifyEmail' : 'pending';
  return { invitation: { invitationId: token, petId: petRef(info.petId), senderId: userRef(info.senderId),
    toEmailAddress: info.toEmailAddress, deliveryStatus: 'pending', acceptanceStatus: info.accepted,
    createdAt: Timestamp.fromMillis(info.createdAt), expiryDate: Timestamp.fromMillis(info.expiresAt), acceptedAt: null },
    pet, family, sender: users[info.senderId] ?? null, user, state };
}
export async function acceptInvite(invitation: Invitation, userId: string): Promise<void> {
  if (auth.currentUser?.uid !== userId) throw new Error('Sign in with the invited email.');
  const result = await acceptInvitation(invitation.invitationId);
  selectedPetStore.set(result.petId);
}
