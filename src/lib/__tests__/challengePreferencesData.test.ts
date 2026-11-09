import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  fetchChallengePreferences,
  saveChallengePreferences,
} from '@/lib/challengePreferencesData';
import { __all, __seed, DocumentReference, Timestamp } from '../../../test/fakeFirestore';

const PET = 'milo';
const petRef = new DocumentReference('pets', PET);
const userRef = (id: string) => new DocumentReference('users', id);

beforeEach(() => {
  for (const [id, name] of [
    ['alex', 'Alex Johnson'],
    ['emma', 'Emma Johnson'],
  ]) {
    __seed('users', id, { name, email: `${id}@example.com`, joinedAt: Timestamp.now() });
    __seed('userPets', `${PET}_${id}`, { petId: petRef, userId: userRef(id), role: 'member' });
  }
});

const preferenceDocs = () => __all('challengePreferences');

describe('fetchChallengePreferences', () => {
  it('returns the family and no saved preferences for a new pet', async () => {
    const page = await fetchChallengePreferences(PET);

    expect(page.family.map((u) => u.name).sort()).toEqual(['Alex Johnson', 'Emma Johnson']);
    expect(page.saved).toBeNull();
  });
});

describe('saveChallengePreferences', () => {
  it('creates one document the first time, with user refs', async () => {
    await saveChallengePreferences(PET, ['alex'], ['Walk', 'Play']);

    expect(preferenceDocs()).toHaveLength(1);
    const [, data] = preferenceDocs()[0];
    expect(data.petId).toEqual(petRef);
    expect(data.userIds).toEqual([userRef('alex')]);
    expect(data.activityTypes).toEqual(['Walk', 'Play']);
  });

  it('defaults each care area to everyone selected', async () => {
    await saveChallengePreferences(PET, ['alex', 'emma'], ['Walk', 'Feed']);

    const page = await fetchChallengePreferences(PET);
    expect(page.saved?.participantsByActivity).toEqual({
      Walk: ['alex', 'emma'],
      Feed: ['alex', 'emma'],
    });
  });

  it('keeps per-area choices when given', async () => {
    await saveChallengePreferences(PET, ['alex', 'emma'], ['Walk', 'Feed'], {
      Walk: ['emma'],
      Feed: ['alex'],
    });

    const page = await fetchChallengePreferences(PET);
    expect(page.saved?.participantsByActivity).toEqual({ Walk: ['emma'], Feed: ['alex'] });
  });

  it('updates the same document on later saves', async () => {
    await saveChallengePreferences(PET, ['alex'], ['Walk']);
    await saveChallengePreferences(PET, ['alex', 'emma'], ['Feed', 'Groom']);

    expect(preferenceDocs()).toHaveLength(1);
    const page = await fetchChallengePreferences(PET);
    expect(page.saved).toMatchObject({
      activityTypes: ['Feed', 'Groom'],
      userIds: ['alex', 'emma'],
    });
  });

  it("does not touch another pet's preferences", async () => {
    await saveChallengePreferences(PET, ['alex'], ['Walk']);
    await saveChallengePreferences('nala', ['alex'], ['Play']);

    expect(preferenceDocs()).toHaveLength(2);
    expect((await fetchChallengePreferences(PET)).saved?.activityTypes).toEqual(['Walk']);
  });
});
