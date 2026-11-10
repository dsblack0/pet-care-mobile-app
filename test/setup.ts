// Runs before every test file. Firestore is replaced with the in-memory fake so tests never
// touch the real project, and firebase/app is stubbed so firebaseConfig.ts can load.
import { beforeEach, jest } from '@jest/globals';
import * as fakeFirestore from './fakeFirestore';

jest.mock('firebase/app', () => ({
  getApps: () => [],
  getApp: () => ({}),
  initializeApp: () => ({}),
}));

jest.mock('firebase/firestore', () => jest.requireActual('./fakeFirestore'));

beforeEach(() => {
  fakeFirestore.__reset();
});
