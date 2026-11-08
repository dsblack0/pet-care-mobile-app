import { collection, doc, getDoc, getDocs, query, where, Timestamp, runTransaction, writeBatch, type DocumentData } from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import { db } from '../firebaseConfig';
import { auth } from '../src/lib/auth';
import { changed, petReference, requireOwner, signedInId, userReference } from './core';

/** Firestore auto-IDs are unpredictable 20-character invitation codes. Keep the code private. */
export type CreatedInvite = { invitationId: string; token: string; expiresAt: number };
export type AcceptedInvite = { petId: string; alreadyMember: boolean };
export type PendingInvitation = { invitationId: string; petId: string; toEmailAddress: string; createdAt: number | null; expiresAt: number | null; accepted: boolean; revoked: boolean };
export type InvitationPreview = { petId: string; senderId: string; petName: string; petSpecies: string; toEmailAddress: string; createdAt: number; expiresAt: number; accepted: boolean; revoked: boolean };
const normalize = (value: string) => value.trim().toLowerCase();
const validToken = (value: string) => /^[A-Za-z0-9_-]{20,}$/.test(value);
const millis = (value: unknown): number => value instanceof Timestamp ? value.toMillis() : 0;
const inviteRef = (token: string) => doc(db, 'invitations', token);

async function ownerMembershipId(petId: string): Promise<string> {
  const uid = signedInId();
  const rows = await getDocs(query(collection(db, 'userPets'), where('petId', '==', petReference(petId)), where('userId', '==', userReference(uid))));
  const owner = rows.docs.find(row => row.data().role === 'owner');
  if (!owner) throw new Error('Only the pet owner can invite family members.');
  return owner.id;
}

async function createInvite(petId: string, address: string, oldInvitationId?: string): Promise<CreatedInvite> {
  const uid = signedInId();
  const ownerId = await ownerMembershipId(petId);
  const pet = await getDoc(petReference(petId));
  if (!pet.exists()) throw new Error('Pet not found.');
  const memberRows = await getDocs(query(collection(db, 'userPets'), where('petId', '==', petReference(petId))));
  const profiles = await Promise.all(memberRows.docs.map(row => getDoc(row.data().userId)));
  if (
    profiles.some(
      profile =>
        normalize(
          String((profile.data() as { email?: string } | undefined)?.email ?? '')
        ) === address
    )
  ) {
    throw new Error('Already a family member.');
  }
  const active = await pendingInvitations(petId);
  if (active.some(inv => inv.toEmailAddress === address && inv.invitationId !== oldInvitationId)) throw new Error('An invitation is already pending for this email.');
  const invitation = doc(collection(db, 'invitations'));
  const membership = doc(collection(db, 'userPets'));
  const now = Timestamp.now();
  const expiresAt = now.toMillis() + 7 * 24 * 60 * 60 * 1000;
  const batch = writeBatch(db);
  if (oldInvitationId) batch.update(inviteRef(oldInvitationId), { revokedAt: now });
  batch.set(invitation, {
    petId: petReference(petId), senderId: userReference(uid), ownerMembershipId: ownerId,
    membershipId: membership.id, toEmailAddress: address, deliveryStatus: 'pending',
    acceptanceStatus: false, createdAt: now, expiryDate: Timestamp.fromMillis(expiresAt),
    acceptedAt: null, acceptedBy: null, revokedAt: null,
    petName: pet.data().name ?? 'your pet', petSpecies: pet.data().species ?? 'Dog',
  });
  await batch.commit();
  changed();
  return { invitationId: invitation.id, token: invitation.id, expiresAt };
}

export async function inviteMember(petId: string, email: string): Promise<CreatedInvite> {
  const address = normalize(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('Enter a valid email address.');
  return createInvite(petId, address);
}

export function invitationLink(token: string, httpsOrigin?: string): string {
  if (!validToken(token)) throw new Error('Invalid invitation code.');
  if (httpsOrigin) {
    const url = new URL(httpsOrigin);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('An HTTPS invitation origin is required.');
    return `${url.origin}/invite/${encodeURIComponent(token)}`;
  }
  return Linking.createURL(`/invite/${encodeURIComponent(token)}`);
}
export async function shareInvitation(token: string, httpsOrigin?: string) {
  const link = invitationLink(token, httpsOrigin);
  return Share.share({ message: `You're invited to join my pet family!\n\nInvitation code (copy this):\n${token}\n\nOpen in the app: ${link}\n\nIf the link isn't clickable, open Pawmily and choose Have an invitation code?\n\nSign in and verify your email to join.`, url: link });
}

export async function acceptInvitation(token: string): Promise<AcceptedInvite> {
  if (!validToken(token)) throw new Error('Invalid invitation code.');
  const uid = signedInId();
  await auth.currentUser!.reload();
  await auth.currentUser!.getIdToken(true);
  if (!auth.currentUser?.emailVerified) throw new Error('Verify your email before joining.');
  const address = normalize(auth.currentUser.email ?? '');
  const invitation = inviteRef(token);
  const initial = await getDoc(invitation);
  if (!initial.exists()) throw new Error('Invitation not found.');
  const initialData = initial.data();
  if (normalize(initialData.toEmailAddress) !== address) throw new Error('This invitation cannot be used with this account.');
  const petId = initialData.petId.id as string;
  const existing = await getDocs(query(collection(db, 'userPets'), where('petId', '==', petReference(petId)), where('userId', '==', userReference(uid))));
  if (!existing.empty) return { petId, alreadyMember: true };
  await runTransaction(db, async tx => {
    const snap = await tx.get(invitation);
    if (!snap.exists()) throw new Error('Invitation not found.');
    const data = snap.data();
    if (data.acceptanceStatus || data.revokedAt || millis(data.expiryDate) <= Date.now()) throw new Error('Invitation expired, revoked or already used.');
    if (normalize(data.toEmailAddress) !== address) throw new Error('This invitation cannot be used with this account.');
    const member = doc(db, 'userPets', data.membershipId);
    const memberSnap = await tx.get(member);
    if (memberSnap.exists()) throw new Error('Invitation already used.');
    tx.set(member, { petId: data.petId, userId: userReference(uid), role: 'member', joinedAt: Timestamp.now(), invitationId: token });
    tx.update(invitation, { acceptanceStatus: true, acceptedAt: Timestamp.now(), acceptedBy: uid });
    // Member counts are derived from userPets records; no unauthorised pet update required.
  });
  changed();
  return { petId, alreadyMember: false };
}

export async function pendingInvitations(petId: string): Promise<PendingInvitation[]> {
  await requireOwner(petId);
  const ownerId = await ownerMembershipId(petId);
  const rows = await getDocs(query(collection(db, 'invitations'), where('ownerMembershipId', '==', ownerId)));
  return rows.docs.map(row => {
    const d = row.data();
    return { invitationId: row.id, petId, toEmailAddress: d.toEmailAddress,
      createdAt: millis(d.createdAt), expiresAt: millis(d.expiryDate),
      accepted: !!d.acceptanceStatus, revoked: !!d.revokedAt };
  }).filter(d => !d.accepted && !d.revoked && (d.expiresAt ?? 0) > Date.now());
}
export async function revokeInvitation(invitationId: string) {
  const snap = await getDoc(inviteRef(invitationId));
  if (!snap.exists()) throw new Error('Invitation not found.');
  await requireOwner(snap.data().petId.id);
  if (snap.data().acceptanceStatus) throw new Error('Accepted invitations cannot be revoked.');
  const batch = writeBatch(db);
  batch.update(inviteRef(invitationId), { revokedAt: Timestamp.now() });
  await batch.commit();
  changed();
}
export async function replaceInvitation(invitationId: string): Promise<CreatedInvite> {
  const snap = await getDoc(inviteRef(invitationId));
  if (!snap.exists()) throw new Error('Invitation not found.');
  if (snap.data().acceptanceStatus || snap.data().revokedAt) throw new Error('Invitation is no longer active.');
  await requireOwner(snap.data().petId.id);
  return createInvite(snap.data().petId.id, normalize(snap.data().toEmailAddress), invitationId);
}
export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  if (!validToken(token)) return null;
  const snap = await getDoc(inviteRef(token));
  if (!snap.exists()) return null;
  const d: DocumentData = snap.data();
  return { petId: d.petId.id, senderId: d.senderId.id, petName: d.petName ?? 'your pet',
    petSpecies: d.petSpecies ?? 'Dog', toEmailAddress: d.toEmailAddress,
    createdAt: millis(d.createdAt), expiresAt: millis(d.expiryDate),
    accepted: !!d.acceptanceStatus, revoked: !!d.revokedAt };
}
