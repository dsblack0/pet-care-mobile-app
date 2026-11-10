import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { auth, sessionStore } from '@/lib/auth';
import { acceptInvite, fetchInviteDetails, sendInvite } from '@/lib/inviteData';
import { clearPendingInvitation } from '@/lib/pendingInvite';
import { selectedPetStore } from '@/lib/store';
import {
  acceptInvitation,
  inviteMember,
  previewInvitation,
  shareInvitation,
} from '../../../modelViews/invitationController';
import { __seed, DocumentReference, Timestamp } from '../../../test/fakeFirestore';

// The invitation controller calls Cloud Functions; here it is replaced with mocks so the tests
// cover only how inviteData turns its answers into what the screens show.
jest.mock('../../../modelViews/invitationController', () => ({
  acceptInvitation: jest.fn(),
  inviteMember: jest.fn(),
  pendingInvitations: jest.fn(),
  previewInvitation: jest.fn(),
  replaceInvitation: jest.fn(),
  shareInvitation: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  auth: { currentUser: null },
  sessionStore: { set: jest.fn(), get: jest.fn() },
}));
jest.mock('@/lib/pendingInvite', () => ({ clearPendingInvitation: jest.fn() }));

const TOKEN = 'abcdefghijklmnopqrstuv';
const DAY = 24 * 60 * 60 * 1000;
const preview = jest.mocked(previewInvitation);

type FakeUser = { uid: string; email: string; emailVerified: boolean } | null;
const signIn = (user: FakeUser) => {
  (auth as { currentUser: FakeUser }).currentUser = user;
};

function invitePreview(overrides: Partial<Awaited<ReturnType<typeof previewInvitation>>> = {}) {
  return {
    petId: 'milo',
    senderId: 'alex',
    petName: 'Milo',
    petSpecies: 'Dog',
    toEmailAddress: 'emma@example.com',
    createdAt: Date.now() - DAY,
    expiresAt: Date.now() + 6 * DAY,
    accepted: false,
    revoked: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  signIn(null);
  const petRef = new DocumentReference('pets', 'milo');
  __seed('pets', 'milo', { name: 'Milo', species: 'Dog', breed: 'Labrador', age: 3 });
  __seed('users', 'alex', { name: 'Alex Johnson', email: 'alex@example.com', joinedAt: Timestamp.now() });
  __seed('users', 'emma', { name: 'Emma Johnson', email: 'emma@example.com', joinedAt: Timestamp.now() });
  __seed('userPets', 'milo_alex', {
    petId: petRef,
    userId: new DocumentReference('users', 'alex'),
    role: 'owner',
  });
});

describe('fetchInviteDetails', () => {
  it('returns null when the invite does not exist', async () => {
    preview.mockResolvedValue(null as never);
    expect(await fetchInviteDetails(TOKEN, 'emma')).toBeNull();
  });

  it('asks to sign in when nobody is signed in, using the public preview', async () => {
    preview.mockResolvedValue(invitePreview());

    const details = await fetchInviteDetails(TOKEN, 'emma');

    expect(details?.state).toBe('signIn');
    expect(details?.pet).toMatchObject({ petId: 'milo', name: 'Milo', species: 'Dog' });
    expect(details?.family).toEqual([]);
  });

  it('flags a different signed-in email', async () => {
    preview.mockResolvedValue(invitePreview());
    signIn({ uid: 'mike', email: 'mike@example.com', emailVerified: true });

    expect((await fetchInviteDetails(TOKEN, 'mike'))?.state).toBe('wrongEmail');
  });

  it('asks to verify the email first', async () => {
    preview.mockResolvedValue(invitePreview());
    signIn({ uid: 'emma', email: 'Emma@Example.com ', emailVerified: false });

    expect((await fetchInviteDetails(TOKEN, 'emma'))?.state).toBe('verifyEmail');
  });

  it('is pending for the invited, verified user and loads the family', async () => {
    preview.mockResolvedValue(invitePreview());
    signIn({ uid: 'emma', email: 'emma@example.com', emailVerified: true });

    const details = await fetchInviteDetails(TOKEN, 'emma');

    expect(details?.state).toBe('pending');
    expect(details?.sender?.name).toBe('Alex Johnson');
    expect(details?.family.map((u) => u.name)).toEqual(['Alex Johnson']);
    expect(details?.pet.breed).toBe('Labrador');
  });

  it.each([
    ['expired', { expiresAt: Date.now() - 1000 }],
    ['revoked', { revoked: true }],
  ])('is expired when the invite is %s', async (_label, overrides) => {
    preview.mockResolvedValue(invitePreview(overrides));
    signIn({ uid: 'emma', email: 'emma@example.com', emailVerified: true });

    expect((await fetchInviteDetails(TOKEN, 'emma'))?.state).toBe('expired');
  });

  it('is member once accepted', async () => {
    preview.mockResolvedValue(invitePreview({ accepted: true }));
    signIn({ uid: 'emma', email: 'emma@example.com', emailVerified: true });

    expect((await fetchInviteDetails(TOKEN, 'emma'))?.state).toBe('member');
  });
});

describe('acceptInvite', () => {
  const invitation = {
    invitationId: TOKEN,
    petId: new DocumentReference('pets', 'milo'),
  } as never;

  it('refuses when the signed-in user is someone else', async () => {
    signIn({ uid: 'mike', email: 'mike@example.com', emailVerified: true });

    await expect(acceptInvite(invitation, 'emma')).rejects.toThrow('Sign in with the invited email.');
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('accepts, switches to the pet and opens the app', async () => {
    signIn({ uid: 'emma', email: 'emma@example.com', emailVerified: true });
    jest.mocked(acceptInvitation).mockResolvedValue({ petId: 'milo', alreadyMember: false });

    await acceptInvite(invitation, 'emma');

    expect(acceptInvitation).toHaveBeenCalledWith(TOKEN);
    expect(selectedPetStore.get()).toBe('milo');
    expect(clearPendingInvitation).toHaveBeenCalled();
    expect(sessionStore.set).toHaveBeenCalledWith('ready');
  });
});

describe('sendInvite', () => {
  it('fails when the sender is not the signed-in user', async () => {
    expect(await sendInvite('milo', 'alex', 'emma@example.com')).toEqual({
      ok: false,
      error: 'Please sign in.',
    });
    expect(inviteMember).not.toHaveBeenCalled();
  });

  it('creates the invite and opens the share sheet', async () => {
    signIn({ uid: 'alex', email: 'alex@example.com', emailVerified: true });
    jest.mocked(inviteMember).mockResolvedValue({
      invitationId: 'inv1',
      token: TOKEN,
      expiresAt: Date.now() + 7 * DAY,
    });

    expect(await sendInvite('milo', 'alex', 'emma@example.com')).toEqual({ ok: true, token: TOKEN });
    expect(inviteMember).toHaveBeenCalledWith('milo', 'emma@example.com');
    expect(shareInvitation).toHaveBeenCalledWith(TOKEN);
  });

  it('passes on the error message when creating fails', async () => {
    signIn({ uid: 'alex', email: 'alex@example.com', emailVerified: true });
    jest.mocked(inviteMember).mockRejectedValue(new Error('Only the pet owner can do this.'));

    expect(await sendInvite('milo', 'alex', 'emma@example.com')).toEqual({
      ok: false,
      error: 'Only the pet owner can do this.',
    });
  });
});
