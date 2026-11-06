/**
 * Where the vault header is kept: two independent places on the device, so that losing one (a cleared key, a write
 * that did not finish, a damaged store) never loses the only copy of the sealed Local Vault Key, which is the one thing that cannot
 * be re-made. Reading takes whichever valid copy is newer and repairs the other. Both are device-only and are not part
 * of backups or sync (the key `proairetosVault` is outside the `proairetos.` prefix).
 */
import { VaultError, parseHeader, type VaultHeader } from './vault';

export interface HeaderStore {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

export const HEADER_KEY = 'proairetosVault';
const DB = 'proairetos-vault';
const STORE = 'header';

/** Browser storage: readable at once, which lets a page know before anything loads that a vault exists. */
export function localStorageHeader(key = HEADER_KEY): HeaderStore & { exists(): boolean } {
  return {
    async read() {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    async write(text) {
      localStorage.setItem(key, text);
    },
    exists() {
      try {
        return localStorage.getItem(key) !== null;
      } catch {
        return false;
      }
    },
  };
}

/** A small database of its own, so the main database and its version are not touched. */
export function indexedDbHeader(factory?: IDBFactory, name = DB): HeaderStore {
  // Looked up when used, not when this is made: places with no IndexedDB (a test, a blocked browser) simply have no second copy.
  const where = () => factory ?? (typeof indexedDB === 'undefined' ? undefined : indexedDB);

  /** Opens the database, making it only when `create` is true; otherwise a database that is not there stays not there. */
  const open = (create: boolean) =>
    new Promise<IDBDatabase | null>((resolve, reject) => {
      const idb = where();
      if (!idb) return reject(new Error('No IndexedDB here.'));
      const request = idb.open(name);
      request.onupgradeneeded = () => {
        if (create) request.result.createObjectStore(STORE);
        else request.transaction?.abort();
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => (create ? reject(request.error) : resolve(null));
    });

  return {
    async read() {
      const db = await open(false);
      if (!db) return null;
      try {
        if (!db.objectStoreNames.contains(STORE)) return null;
        return await new Promise<string | null>((resolve, reject) => {
          const request = db.transaction(STORE).objectStore(STORE).get('header');
          request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
          request.onerror = () => reject(request.error);
        });
      } finally {
        db.close();
      }
    },
    async write(text) {
      const db = await open(true);
      if (!db) throw new Error('Could not open the vault copy.');
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(text, 'header');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
  };
}

export type VaultLoad =
  | { state: 'none' }
  | { state: 'ok'; header: VaultHeader; repaired: boolean }
  | { state: 'corrupt' };

export type VaultStorage = {
  load(): Promise<VaultLoad>;
  save(header: VaultHeader): Promise<void>;
};

const attempt = async <T>(task: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> => {
  try {
    return { ok: true, value: await task() };
  } catch {
    return { ok: false };
  }
};

export function createVaultStorage(primary: HeaderStore, secondary: HeaderStore): VaultStorage {
  return {
    async load() {
      const texts = await Promise.all([attempt(() => primary.read()), attempt(() => secondary.read())]);
      const found = texts.map((each) => (each.ok ? each.value : null));
      const valid: (VaultHeader | null)[] = found.map((text) => {
        if (text === null) return null;
        try {
          return parseHeader(text);
        } catch (cause) {
          if (cause instanceof VaultError) return null;
          throw cause;
        }
      });
      const best = valid.filter((each): each is VaultHeader => each !== null).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
      if (!best) return found.some((text) => text !== null) ? { state: 'corrupt' } : { state: 'none' };
      // A copy that is missing, damaged or older is written again from the newest valid one.
      const text = JSON.stringify(best);
      let repaired = false;
      for (const [index, store] of [primary, secondary].entries()) {
        if (found[index] !== text) {
          repaired = true;
          await attempt(() => store.write(text));
        }
      }
      return { state: 'ok', header: best, repaired };
    },
    async save(header) {
      const text = JSON.stringify(header);
      // The first copy must be written; the second is best effort and is repaired on the next read.
      await primary.write(text);
      await attempt(() => secondary.write(text));
    },
  };
}
