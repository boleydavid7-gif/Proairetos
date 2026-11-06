// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { orderLifeRecords, type LifeRecord } from '../../core/life-records';
import { libraryRecords, type Provider } from '../../core/providers';
import { hostContext } from '../../app/providers/context';
import { providedLibraryApps } from '../../app/providers/libraryPath';
import { libraryStore } from '../../app/providers/library';
import { providerModules } from '../../app/providers/registry';
import { STATES, gather, seedCompanions } from './libraryFixtures';

/*
 * The apps that give their Library entries through providers, old way and new way. The old way is the page's own gathering of every
 * source (`gather()`); the new way leaves those apps out of it (the skip list) and takes their entries from their providers, through the
 * host, with the Store's real availability. The two must list the same entries, field for field, in the same order, with nothing twice.
 */
const MOVED = ['askesis', 'dynamis', 'soma'];
const now = new Date('2026-11-05T12:00:00');

async function providers(): Promise<Provider<'library'>[]> {
  const modules = await Promise.all(providedLibraryApps().map((app) => providerModules[app]!()));
  return modules.flatMap((module) => module.providers).filter((provider): provider is Provider<'library'> => provider.capability === 'library');
}
async function viaProviders() {
  const skip = new Set<string>(providedLibraryApps());
  const rest = await gather(skip);
  const given = await libraryRecords(await providers(), APPS, hostContext(now));
  return { rest, given, merged: orderLifeRecords([...rest, ...given.records]) };
}

beforeEach(async () => {
  await seedCompanions();
  STATES['every app added (the owner)']();
});

describe('the apps whose entries come through providers', () => {
  it('are the ones this step moved, and every one has its Library classified', () => {
    expect(providedLibraryApps().sort()).toEqual(MOVED);
    for (const id of MOVED) {
      const library = APPS.find((app) => app.id === id)!.library!;
      expect(library.kinds.length, id).toBeGreaterThan(0);
      expect(library.shows.length, id).toBeGreaterThan(0);
      expect(library.detailsOnly.length, id).toBeGreaterThan(0);
      expect(library.excludes.length, id).toBeGreaterThan(0);
      const stated = new Set([...library.shows, ...library.detailsOnly]);
      expect(library.excludes.filter((field) => stated.has(field)), id).toEqual([]);
    }
  });
  it('list the same entries as the page’s own gathering, field for field, in the same order', async () => {
    const old = await gather();
    const { merged, given } = await viaProviders();
    expect(given.rejected).toEqual([]);
    expect(JSON.stringify(merged)).toBe(JSON.stringify(old));
    expect(merged).toHaveLength(19);
  });
  it('are left out of the old gathering when their provider is active, so nothing is listed twice', async () => {
    const { rest, merged } = await viaProviders();
    expect(rest.filter((record) => MOVED.includes(record.sourceApp) && record.kind !== 'reflection')).toEqual([]);
    const keys = merged.map((record) => record.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect((await gather()).filter((record) => MOVED.includes(record.sourceApp) && record.kind !== 'reflection').length).toBeGreaterThan(0);
  });
  it('keep the owner, kind, source id and times of every entry, so the links to the app are the same', async () => {
    const old = new Map((await gather()).map((record) => [record.key, record]));
    const { given } = await viaProviders();
    expect(given.records.length).toBeGreaterThan(0);
    for (const record of given.records) {
      const was = old.get(record.key)!;
      expect([record.sourceApp, record.source, record.kind, record.sourceId, record.at]).toEqual([was.sourceApp, was.source, was.kind, was.sourceId, was.at]);
    }
  });
});

describe('an app that is removed, not bought or past its trial', () => {
  it('gives the Library nothing through its provider', async () => {
    for (const name of ['every app removed (the owner)', 'apps added, not bought and no trial left'] as const) {
      STATES[name]();
      const { given } = await viaProviders();
      expect(given.records, name).toEqual([]);
    }
  });
  it('also hides the reflections written from its prompts, without changing them', async () => {
    STATES['every app removed (the owner)']();
    const own: LifeRecord[] = await gather(new Set(providedLibraryApps()));
    const frozen = JSON.stringify(own);
    const visible = libraryStore.visible(own);
    expect(visible.some((record) => record.key === 'reflection:rf2')).toBe(false);
    expect(visible.some((record) => record.key === 'reflection:rf1')).toBe(true);
    expect(JSON.stringify(own)).toBe(frozen);
  });
});

describe('what the providers keep out', () => {
  it('lets no marked value into any entry: not heart rate, shoes, anything an app did not project', async () => {
    const { given } = await viaProviders();
    const text = JSON.stringify(given.records);
    expect(text).not.toMatch(/CANARY|avgHr|shoeId/);
    expect(given.records.every((record) => Object.keys(record).every((key) => ['key', 'kind', 'sourceApp', 'source', 'sourceId', 'at', 'title', 'detail', 'body', 'searchText', 'valueIds', 'archived'].includes(key)))).toBe(true);
  });
  it('read and write nothing: the source records are as they were and no new store appears', async () => {
    const keys = () => JSON.stringify(Object.entries(localStorage));
    const databases = async () => JSON.stringify((await indexedDB.databases()).map((db) => db.name).sort());
    const before = [keys(), await databases(), JSON.stringify(await gather())];
    await viaProviders();
    expect([keys(), await databases(), JSON.stringify(await gather())]).toEqual(before);
  });
});
