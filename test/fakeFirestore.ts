// In-memory stand-in for "firebase/firestore", used by the Jest tests (see test/setup.ts).
// It covers only what the app's data files call: references, equality queries, reads,
// set/add/update and increment(). Seed data with __seed and inspect it with __get/__all.

type Data = Record<string, unknown>;

export class Timestamp {
  constructor(private readonly ms: number) {}
  static now() {
    return new Timestamp(Date.now());
  }
  static fromDate(date: Date) {
    return new Timestamp(date.getTime());
  }
  static fromMillis(ms: number) {
    return new Timestamp(ms);
  }
  toDate() {
    return new Date(this.ms);
  }
  toMillis() {
    return this.ms;
  }
}

export class GeoPoint {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}
}

export class DocumentReference {
  constructor(
    readonly collection: string,
    readonly id: string,
  ) {}
  get path() {
    return `${this.collection}/${this.id}`;
  }
}

type CollectionRef = { kind: 'collection'; name: string };
type Where = { field: string; op: '=='; value: unknown };
type Query = { kind: 'query'; name: string; wheres: Where[] };

const store = new Map<string, Map<string, Data>>();
let nextId = 0;

const table = (name: string) => {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
};

const same = (a: unknown, b: unknown) =>
  a instanceof DocumentReference && b instanceof DocumentReference ? a.path === b.path : a === b;

const snapshot = (name: string, id: string) => {
  const data = table(name).get(id);
  return { id, ref: new DocumentReference(name, id), exists: () => !!data, data: () => data };
};

export const getFirestore = () => ({});

export const collection = (_db: unknown, name: string): CollectionRef => ({
  kind: 'collection',
  name,
});

/** doc(db, name, id) for a known id, or doc(collection(...)) for a new auto id. */
export function doc(parent: unknown, name?: string, id?: string): DocumentReference {
  if ((parent as CollectionRef)?.kind === 'collection') {
    return new DocumentReference((parent as CollectionRef).name, `auto${++nextId}`);
  }
  return new DocumentReference(name!, id!);
}

export const where = (field: string, op: '==', value: unknown): Where => ({ field, op, value });

export const query = (coll: CollectionRef, ...wheres: Where[]): Query => ({
  kind: 'query',
  name: coll.name,
  wheres,
});

export async function getDocs(q: Query | CollectionRef) {
  const wheres = q.kind === 'query' ? q.wheres : [];
  const docs = [...table(q.name).entries()]
    .filter(([, data]) => wheres.every((w) => same(data[w.field], w.value)))
    .map(([id]) => snapshot(q.name, id));
  return { docs, empty: docs.length === 0, size: docs.length };
}

export async function getDoc(ref: DocumentReference) {
  return snapshot(ref.collection, ref.id);
}

export async function setDoc(ref: DocumentReference, data: Data) {
  table(ref.collection).set(ref.id, { ...data });
}

export async function addDoc(coll: CollectionRef, data: Data) {
  const ref = doc(coll);
  await setDoc(ref, data);
  return ref;
}

const INCREMENT = Symbol('increment');
export const increment = (by: number) => ({ [INCREMENT]: by });

export async function updateDoc(ref: DocumentReference, changes: Data) {
  const current = table(ref.collection).get(ref.id);
  if (!current) throw new Error(`No document to update: ${ref.path}`);
  for (const [key, value] of Object.entries(changes)) {
    const by = (value as Record<symbol, number> | null)?.[INCREMENT];
    current[key] = by === undefined ? value : Number(current[key] ?? 0) + by;
  }
}

// ---- Test helpers ----

export function __reset() {
  store.clear();
  nextId = 0;
}

export function __seed(name: string, id: string, data: Data) {
  table(name).set(id, { ...data });
}

export function __get(name: string, id: string): Data | undefined {
  return table(name).get(id);
}

export function __all(name: string): [string, Data][] {
  return [...table(name).entries()];
}
