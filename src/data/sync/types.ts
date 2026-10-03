/** Collections that sync. Each maps to a local store of the same name. */
export const syncCollections = [
  'lifeItems',
  'itemEvents',
  'reflections',
  'values',
  'statements',
  'schedulePatterns',
  'scheduleExceptions',
  'decisions',
  'askesisWorkouts',
  'askesisPlans',
  'somaRecipes',
  'somaGroceries',
] as const;

/**
 * Collections a server may not accept yet (added by a later migration). If
 * pushing them is refused, they wait for the next sync and the rest goes on.
 */
export const laterCollections: readonly string[] = ['askesisWorkouts', 'askesisPlans', 'somaRecipes', 'somaGroceries'];

export type SyncCollection = (typeof syncCollections)[number];

export type LocalRecord = { id: string } & Record<string, unknown>;

/** Raw access to local records, below the repositories, for sync only. */
export interface LocalSyncStore {
  list(collection: SyncCollection): Promise<LocalRecord[]>;
  put(collection: SyncCollection, record: LocalRecord): Promise<void>;
  remove(collection: SyncCollection, id: string): Promise<void>;
}

/** What this device last saw for each record, and small bits of sync state. */
export interface SyncStateStore {
  fingerprints(): Promise<Map<string, string>>;
  setFingerprint(key: string, fingerprint: string): Promise<void>;
  removeFingerprint(key: string): Promise<void>;
  getMeta<T>(name: string): Promise<T | undefined>;
  setMeta(name: string, value: unknown): Promise<void>;
  clear(): Promise<void>;
}

export interface RemoteRecord {
  collection: SyncCollection;
  id: string;
  iv: string | null;
  ciphertext: string | null;
  deleted: boolean;
  seq: number;
}

export type OutgoingRecord = Omit<RemoteRecord, 'seq'>;

/** The server side. It only ever sees sealed records. */
export interface RemoteStore {
  /** Records changed after a sequence number, oldest first. */
  pull(afterSeq: number, limit: number): Promise<RemoteRecord[]>;
  push(records: OutgoingRecord[]): Promise<void>;
}
