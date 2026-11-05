import { describe, expect, it } from 'vitest';
import { sourceChanged } from '../../core/providers';
import { withCache } from '../../app/providers/cache';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { OutgoingRecord, RemoteRecord, RemoteStore } from '../../data/sync/types';
import { oikonomiaSearch } from '../../oikonomia/providers/search';

const ids = (entries: Record<string, string[]>) => new Map(Object.entries(entries));

describe('which sources a sync makes out of date', () => {
  it('a named collection drops only the providers that read it', () => {
    expect(sourceChanged(['oikonomiaBills'], ['oikonomiaBills'])).toBe(true);
    expect(sourceChanged(['oikonomiaBills'], ['somaRecipes'])).toBe(false);
  });
  it('a setting change drops only the records under its own prefix', () => {
    const changed = ids({ preferences: ['ergon:chore:c1'] });
    expect(sourceChanged(['local:ergon:chore:'], ['preferences'], changed)).toBe(true);
    expect(sourceChanged(['local:philia:person:'], ['preferences'], changed)).toBe(false);
    expect(sourceChanged(['setting:hydros:settings'], ['preferences'], changed)).toBe(false);
    expect(sourceChanged(['setting:hydros:settings'], ['preferences'], ids({ preferences: ['hydros:settings'] }))).toBe(true);
  });
  it('without record ids every setting source is dropped, and an unknown change drops everything', () => {
    expect(sourceChanged(['local:ergon:chore:'], ['preferences'])).toBe(true);
    expect(sourceChanged(['oikonomiaBills'], ['*'])).toBe(true);
  });
  it('a shared list is dropped only by its own watcher', () => {
    expect(sourceChanged(['shared:ergon'], ['preferences', 'somaRecipes'], ids({ preferences: ['ergon:x'] }))).toBe(false);
    expect(sourceChanged(['shared:ergon'], ['*'])).toBe(true);
  });
});

describe('a cached provider result', () => {
  it('survives a change to another app’s record and drops on its own', async () => {
    let reads = 0;
    const listeners = new Set<(collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void>();
    const emit = (collections: readonly string[], map?: ReadonlyMap<string, readonly string[]>) => listeners.forEach((listener) => listener(collections, map));
    const base = { ...oikonomiaSearch, sources: ['local:ergon:chore:'], read: () => { reads += 1; return []; } };
    const cached = withCache(base, (listener) => { listeners.add(listener); return () => listeners.delete(listener); });
    const ctx = { today: '2026-11-05', now: new Date(), records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true } as never;
    await cached.read(ctx);
    emit(['preferences'], ids({ preferences: ['philia:person:p1'] }));
    await cached.read(ctx);
    expect(reads).toBe(1);
    emit(['preferences'], ids({ preferences: ['ergon:chore:c9'] }));
    await cached.read(ctx);
    expect(reads).toBe(2);
  });
});

describe('the sync engine says which records a pull changed', () => {
  it('reports the collections and the ids', async () => {
    const rows = new Map<string, RemoteRecord>();
    let seq = 0;
    const remote: RemoteStore = {
      async pull(after, limit) {
        return [...rows.values()].filter((row) => row.seq > after).sort((a, b) => a.seq - b.seq).slice(0, limit);
      },
      async push(records: OutgoingRecord[]) {
        for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq });
      },
    };
    const key = (await createKeys('quiet river morning')).dataKey;
    const a = { local: createMemoryLocalSyncStore(), seen: [] as { collections: readonly string[]; ids: Record<string, readonly string[]> }[] };
    const b = { local: createMemoryLocalSyncStore(), seen: [] as { collections: readonly string[]; ids: Record<string, readonly string[]> }[] };
    const engineA = createSyncEngine({ local: a.local, state: createMemorySyncStateStore(), remote, key });
    const engineB = createSyncEngine({ local: b.local, state: createMemorySyncStateStore(), remote, key, onChanged: (collections, map) => b.seen.push({ collections, ids: Object.fromEntries(map) }) });
    await a.local.put('preferences', { id: 'ergon:chore:c1', value: '{}' });
    await a.local.put('oikonomiaBills', { id: 'b1', name: 'Internet' });
    await engineA.sync();
    await engineB.sync();
    expect(b.seen).toHaveLength(1);
    expect([...b.seen[0].collections].sort()).toEqual(['oikonomiaBills', 'preferences']);
    expect(b.seen[0].ids).toEqual({ preferences: ['ergon:chore:c1'], oikonomiaBills: ['b1'] });
    await engineB.sync();
    expect(b.seen).toHaveLength(1);
  }, 30_000);
});

describe('same-tab record changes', () => {
  it('reach a watcher of that prefix and no other', async () => {
    const { announceLocal, watchLocal } = await import('../../app/family/localChanges');
    const seen: string[] = [];
    const offA = watchLocal('ergon:chore:', () => seen.push('ergon'));
    const offB = watchLocal('philia:person:', () => seen.push('philia'));
    announceLocal('ergon:chore:');
    expect(seen).toEqual(['ergon']);
    offA();
    announceLocal('ergon:chore:');
    expect(seen).toEqual(['ergon']);
    offB();
  });
  it('a cached result older than five minutes is rebuilt', async () => {
    let reads = 0;
    const base = { ...oikonomiaSearch, read: () => { reads += 1; return []; } };
    const cached = withCache(base, () => () => undefined);
    const at = (minutes: number) => ({ today: '2026-11-05', now: new Date(Date.UTC(2026, 10, 5, 12, minutes)), records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true }) as never;
    await cached.read(at(0));
    await cached.read(at(4));
    expect(reads).toBe(1);
    await cached.read(at(6));
    expect(reads).toBe(2);
  });
});
