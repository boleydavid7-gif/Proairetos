/**
 * The one interface local records will go through once they are sealed (Stage 3). Nothing uses it for the existing
 * stores yet: no record is sealed or moved by this change.
 *
 * A `SecureRecordStore` sits in front of any key-value backend (an IndexedDB store, a set of browser-storage keys, an
 * in-memory map). It can **read both forms** of a value, plain and sealed, so a build that has it works on data that is
 * still plain and on data that has been sealed; that is what lets sealing ship in two steps (a build that reads both, then
 * one that writes sealed). Writing sealed is a mode the owner turns on per store, never the default.
 */
import { LockedError } from './locked';
import { openRecord, sealRecord, type SealedRecord } from '../sync/keys';

/** A sealed value as it is stored. The marker tells it apart from a plain value. */
export type SealedValue = SealedRecord & { sealed: 1 };

export const isSealedValue = (value: unknown): value is SealedValue =>
  typeof value === 'object' && value !== null && (value as { sealed?: unknown }).sealed === 1 && typeof (value as SealedValue).iv === 'string' && typeof (value as SealedValue).ciphertext === 'string';

/** Where values are kept. */
export interface KeyValueBackend {
  get(id: string): Promise<unknown | undefined>;
  put(id: string, value: unknown): Promise<void>;
  delete(id: string): Promise<void>;
  ids(): Promise<string[]>;
}

/** The vault's key, or a `LockedError` while it is locked. */
export type KeySource = () => CryptoKey;

export type StoreMode = 'plain' | 'sealed';

export class SecureRecordStore<T> {
  constructor(
    /** Names the store; it is part of what every sealed value is bound to. */
    readonly name: string,
    readonly backend: KeyValueBackend,
    private readonly key: KeySource,
    /** What new writes look like. Reads accept both whatever this is. */
    private mode: StoreMode = 'plain',
  ) {}

  private collection() {
    return `local:${this.name}`;
  }

  setMode(mode: StoreMode): void {
    this.mode = mode;
  }

  async get(id: string): Promise<T | undefined> {
    const stored = await this.backend.get(id);
    if (stored === undefined) return undefined;
    if (!isSealedValue(stored)) return stored as T;
    return openRecord<T>(this.key(), this.collection(), id, stored);
  }

  async put(id: string, value: T): Promise<void> {
    if (this.mode === 'plain') return this.backend.put(id, value);
    const sealed = await sealRecord(this.key(), this.collection(), id, value);
    await this.backend.put(id, { sealed: 1, ...sealed } satisfies SealedValue);
  }

  async delete(id: string): Promise<void> {
    await this.backend.delete(id);
  }

  /** Every value, opened. Fails with `LockedError` if any is sealed and the vault is locked. */
  async all(): Promise<{ id: string; value: T }[]> {
    const out: { id: string; value: T }[] = [];
    for (const id of await this.backend.ids()) {
      const value = await this.get(id);
      if (value !== undefined) out.push({ id, value });
    }
    return out;
  }

  /** How many values are sealed and how many are plain: what a migration pass counts before and after. */
  async counts(): Promise<{ sealed: number; plain: number }> {
    let sealed = 0;
    let plain = 0;
    for (const id of await this.backend.ids()) {
      if (isSealedValue(await this.backend.get(id))) sealed += 1;
      else plain += 1;
    }
    return { sealed, plain };
  }
}

/** A map in memory: for tests and for stores that have no backend yet. */
export function memoryBackend(): KeyValueBackend {
  const map = new Map<string, unknown>();
  return {
    async get(id) {
      return map.has(id) ? structuredClone(map.get(id)) : undefined;
    },
    async put(id, value) {
      map.set(id, structuredClone(value));
    },
    async delete(id) {
      map.delete(id);
    },
    async ids() {
      return [...map.keys()];
    },
  };
}

export { LockedError };
