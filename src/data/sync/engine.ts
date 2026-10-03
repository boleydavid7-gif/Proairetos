import { openRecord, sealRecord } from './keys';
import {
  laterCollections,
  syncCollections,
  type LocalRecord,
  type LocalSyncStore,
  type OutgoingRecord,
  type RemoteStore,
  type SyncCollection,
  type SyncStateStore,
} from './types';

const PAGE = 500;
const CURSOR = 'cursor';

/** Same content, same string: keys sorted at every level. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function fingerprint(record: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableStringify(record)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const stateKey = (collection: SyncCollection, id: string) => `${collection}:${id}`;

export type SyncResult = { pulled: number; pushed: number; held?: number };

/**
 * Local-first sync. The device stays the source of truth; the server holds
 * only sealed copies. Each run pulls what changed elsewhere, then pushes
 * what changed here.
 *
 * Change detection compares each record's fingerprint with the one recorded
 * at the last sync, so nothing else in the app needs to know sync exists.
 * When a record changed both here and elsewhere since the last sync, this
 * device's version is kept and pushed, so local work is never silently lost.
 */
export function createSyncEngine(deps: {
  local: LocalSyncStore;
  state: SyncStateStore;
  remote: RemoteStore;
  key: CryptoKey;
}) {
  const { local, state, remote, key } = deps;
  let running: Promise<SyncResult> | null = null;

  async function snapshot() {
    const records = new Map<string, { collection: SyncCollection; record: LocalRecord; fp: string }>();
    for (const collection of syncCollections) {
      for (const record of await local.list(collection)) {
        records.set(stateKey(collection, record.id), { collection, record, fp: await fingerprint(record) });
      }
    }
    return records;
  }

  async function pull(): Promise<number> {
    let cursor = (await state.getMeta<number>(CURSOR)) ?? 0;
    let applied = 0;
    const known = await state.fingerprints();
    const current = await snapshot();

    for (;;) {
      const page = await remote.pull(cursor, PAGE);
      for (const incoming of page) {
        const k = stateKey(incoming.collection, incoming.id);
        const here = current.get(k);
        const lastSynced = known.get(k);
        const dirtyHere = here ? here.fp !== lastSynced : lastSynced !== undefined;

        if (!dirtyHere) {
          if (incoming.deleted) {
            if (here) {
              await local.remove(incoming.collection, incoming.id);
              applied++;
            }
            await state.removeFingerprint(k);
            known.delete(k);
          } else if (incoming.iv && incoming.ciphertext) {
            const record = await openRecord<LocalRecord>(key, incoming.collection, incoming.id, {
              iv: incoming.iv,
              ciphertext: incoming.ciphertext,
            });
            const fp = await fingerprint(record);
            if (fp !== here?.fp) {
              await local.put(incoming.collection, record);
              applied++;
            }
            await state.setFingerprint(k, fp);
            known.set(k, fp);
            current.set(k, { collection: incoming.collection, record, fp });
          }
        }
        cursor = Math.max(cursor, incoming.seq);
      }
      await state.setMeta(CURSOR, cursor);
      if (page.length < PAGE) return applied;
    }
  }

  async function push(): Promise<{ pushed: number; held: number }> {
    const known = await state.fingerprints();
    const current = await snapshot();
    const outgoing: { record: OutgoingRecord; key: string; fp?: string }[] = [];

    for (const [k, entry] of current) {
      if (known.get(k) === entry.fp) continue;
      const sealed = await sealRecord(key, entry.collection, entry.record.id, entry.record);
      outgoing.push({
        key: k,
        fp: entry.fp,
        record: { collection: entry.collection, id: entry.record.id, ...sealed, deleted: false },
      });
    }
    for (const k of known.keys()) {
      if (current.has(k)) continue;
      const [collection, ...rest] = k.split(':');
      outgoing.push({
        key: k,
        record: { collection: collection as SyncCollection, id: rest.join(':'), iv: null, ciphertext: null, deleted: true },
      });
    }

    const send = async (entries: typeof outgoing) => {
      for (let i = 0; i < entries.length; i += PAGE) {
        const batch = entries.slice(i, i + PAGE);
        await remote.push(batch.map((entry) => entry.record));
        for (const entry of batch) {
          if (entry.fp) await state.setFingerprint(entry.key, entry.fp);
          else await state.removeFingerprint(entry.key);
        }
      }
    };
    const isLater = (entry: (typeof outgoing)[number]) => laterCollections.includes(entry.record.collection);
    await send(outgoing.filter((entry) => !isLater(entry)));
    const later = outgoing.filter(isLater);
    try {
      await send(later);
      return { pushed: outgoing.length, held: 0 };
    } catch {
      // A server without the newer migration refuses these; they stay changed here and go next time.
      return { pushed: outgoing.length - later.length, held: later.length };
    }
  }

  return {
    /** One full sync. Overlapping calls share the run in progress. */
    sync(): Promise<SyncResult> {
      running ??= (async () => {
        try {
          const pulled = await pull();
          const { pushed, held } = await push();
          return held ? { pulled, pushed, held } : { pulled, pushed };
        } finally {
          running = null;
        }
      })();
      return running;
    },
  };
}
