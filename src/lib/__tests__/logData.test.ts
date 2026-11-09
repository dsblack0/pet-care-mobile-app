import { describe, expect, it, jest } from '@jest/globals';
import { fetchPointsTable, logActivity, type LogActivityInput } from '@/lib/logData';
import { uploadImage } from '@/lib/storage';
import { dataVersionStore } from '@/lib/store';
import {
  __all,
  __seed,
  DocumentReference,
  GeoPoint,
  Timestamp,
} from '../../../test/fakeFirestore';

// Image uploads go to Cloudinary; the tests only check the returned URL is saved.
jest.mock('@/lib/storage', () => ({
  uploadImage: jest.fn(async () => 'https://images.example/memory.jpg'),
}));

const PET = 'pet1';
const ALEX = 'alex';
const petRef = new DocumentReference('pets', PET);

function input(overrides: Partial<LogActivityInput> = {}): LogActivityInput {
  return {
    petId: PET,
    createdBy: ALEX,
    activityType: 'Walk',
    occurredAt: new Date(),
    participants: [ALEX],
    basePoints: 20,
    bonusPoints: 0,
    ...overrides,
  };
}

const savedMemories = () => __all('memories').map(([, data]) => data);

describe('logActivity', () => {
  it('saves a memory with refs, points and no location by default', async () => {
    const memory = await logActivity(input({ durationMinutes: 30, description: 'Park loop' }));

    expect(savedMemories()).toHaveLength(1);
    expect(memory.petId).toEqual(petRef);
    expect(memory.createdBy).toEqual(new DocumentReference('users', ALEX));
    expect(memory.participants).toEqual([new DocumentReference('users', ALEX)]);
    expect(memory.durationMinutes).toBe(30);
    expect(memory.description).toBe('Park loop');
    expect(memory.basePoints).toBe(20);
    expect(memory.location).toBeNull();
    expect(memory.photoPath).toBeNull();
  });

  it('stores the location as a GeoPoint', async () => {
    const memory = await logActivity(input({ location: { latitude: 40.44, longitude: -79.94 } }));

    expect(memory.location).toBeInstanceOf(GeoPoint);
    expect(memory.location).toMatchObject({ latitude: 40.44, longitude: -79.94 });
  });

  it('uploads the photo and saves the returned URL', async () => {
    const memory = await logActivity(input({ localPhotoUri: 'file:///photo.jpg' }));

    expect(uploadImage).toHaveBeenCalledWith('file:///photo.jpg', `memories/${memory.memoryId}.jpg`);
    expect(memory.photoPath).toBe('https://images.example/memory.jpg');
  });

  it("links today's first unlogged schedule for that activity, then the next one", async () => {
    __seed('careSchedules', 'morning', {
      petId: petRef,
      activityType: 'Walk',
      scheduledTime: '08:00',
      recurrence: 'daily',
    });
    __seed('careSchedules', 'evening', {
      petId: petRef,
      activityType: 'Walk',
      scheduledTime: '18:00',
      recurrence: 'daily',
    });

    const first = await logActivity(input());
    const second = await logActivity(input());
    const third = await logActivity(input());

    expect(first.careScheduleId?.id).toBe('morning');
    expect(second.careScheduleId?.id).toBe('evening');
    expect(third.careScheduleId).toBeNull();
  });

  it('does not link a schedule for a different activity', async () => {
    __seed('careSchedules', 'dinner', {
      petId: petRef,
      activityType: 'Feed',
      scheduledTime: '18:00',
      recurrence: 'daily',
    });

    const memory = await logActivity(input({ activityType: 'Walk' }));

    expect(memory.careScheduleId).toBeNull();
  });

  it('tells screens to reload', async () => {
    const before = dataVersionStore.get();
    await logActivity(input());
    expect(dataVersionStore.get()).toBe(before + 1);
  });

  it('records when the activity happened', async () => {
    const when = new Date('2026-11-01T15:30:00Z');
    const memory = await logActivity(input({ occurredAt: when }));
    expect(memory.occurredAt).toEqual(Timestamp.fromDate(when));
  });
});

describe('fetchPointsTable', () => {
  it('maps each action to its points', async () => {
    __seed('points', 'p1', { action: 'Walk', pointsGained: 20 });
    __seed('points', 'p2', { action: 'TogetherBonus', pointsGained: 5 });

    expect(await fetchPointsTable()).toEqual({ Walk: 20, TogetherBonus: 5 });
  });
});
