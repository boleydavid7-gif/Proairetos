// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { APPS, type AppManifest } from '../../core/apps';
import { createLifeRecord, type LifeRecord } from '../../core/life-records';
import type { HostContext, Provider } from '../../core/providers';
import { createLibraryStore, type LibraryDeps } from '../../app/providers/libraryStore';
import { libraryProvidersOn, providedLibraryApps, setLibraryProviders } from '../../app/providers/libraryPath';
import { libraryStore, useLibraryRecords } from '../../app/providers/library';

/* The Library's store: when an app's entries are derived, that nothing is stored, the device switch and the hook. */
const withLibrary = (...ids: string[]): AppManifest[] =>
  APPS.map((app) => (ids.includes(app.id) ? { ...app, provides: [...(app.provides ?? []), 'library' as const], library: { kinds: ['workout', 'meal'], shows: ['a title'], excludes: ['heart rate'] } } : app));
const manifest = withLibrary('askesis', 'dynamis', 'soma');

const entry = (id: string, extra: Partial<LifeRecord> = {}): LifeRecord =>
  createLifeRecord({ key: `workout:${id}`, kind: 'workout', sourceApp: 'askesis', source: 'Askesis', sourceId: id, at: '2026-10-14T07:10:00.000Z', title: `Run ${id}`, valueIds: [], archived: false, ...extra });
const provider = (app: 'askesis' | 'dynamis' | 'soma', output: () => LifeRecord[], extra: Partial<Provider<'library'>> = {}): Provider<'library'> => ({ app, capability: 'library', version: 1, privacy: 'own-search', sources: [`${app}:src`], read: () => output(), ...extra });
const dynamisEntry = (id: string) => entry(id, { key: `dynamis-workout:${id}`, sourceApp: 'dynamis', source: 'Dynamis' });

function store(providers: Provider<'library'>[], overrides: Partial<LibraryDeps> = {}) {
  const synced = new Set<(collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void>();
  const choices = new Set<() => void>();
  let clock = new Date('2026-11-05T12:00:00');
  const deps: LibraryDeps = {
    manifest,
    load: async (app) => providers.filter((each) => each.app === app),
    context: (now) => ({ today: '2026-11-05', now, records: async () => [], setting: () => null, isUsable: () => true, enabled: () => true }) as HostContext,
    usable: () => true,
    enabled: () => true,
    onSynced: (listener) => { synced.add(listener); return () => synced.delete(listener); },
    onChoices: (listener) => { choices.add(listener); return () => choices.delete(listener); },
    now: () => clock,
    ...overrides,
  };
  return {
    instance: createLibraryStore(deps),
    sync: (collections: string[], ids?: Map<string, string[]>) => synced.forEach((listener) => listener(collections, ids)),
    choose: () => choices.forEach((listener) => listener()),
    setClock: (next: Date) => { clock = next; },
  };
}

afterEach(() => { cleanup(); localStorage.clear(); });

describe('when an app’s entries are derived', () => {
  it('derives nothing until the Library is shown, then each eligible app once', async () => {
    const { instance } = store([provider('askesis', () => [entry('a1')]), provider('dynamis', () => [dynamisEntry('w1')])]);
    expect(instance.derivations()).toEqual([]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.derivations().map((each) => each.app).sort()).toEqual(['askesis', 'dynamis']);
    expect(instance.records().map((record) => record.key)).toEqual(['workout:a1', 'dynamis-workout:w1']);
    off();
  });
  it('asks only an app that is added and usable and not switched off', async () => {
    const { instance } = store([provider('askesis', () => [entry('a1')]), provider('dynamis', () => [dynamisEntry('w1')])], { usable: (app) => app !== 'dynamis' });
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.records().map((record) => record.sourceApp)).toEqual(['askesis']);
    off();
  });
  it('a sync that changed one app’s records derives only that app', async () => {
    const { instance, sync } = store([provider('askesis', () => [entry('a1')], { sources: ['askesisWorkouts'] }), provider('dynamis', () => [], { sources: ['local:dynamis:workout:'] })]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const before = instance.derivations().length;
    sync(['preferences'], new Map([['preferences', ['dynamis:workout:w9']]]));
    await instance.settled();
    expect(instance.derivations().slice(before).map((each) => each.app)).toEqual(['dynamis']);
    off();
  });
  it('a change inside an app, told by its provider, derives only that app and shows the new entries', async () => {
    let tell = () => undefined as void;
    let runs = [entry('a1')];
    const { instance } = store([provider('askesis', () => runs, { subscribe: (listener) => { tell = listener; return () => undefined; } }), provider('dynamis', () => [])]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const before = instance.derivations().length;
    runs = [entry('a1'), entry('a2')];
    tell();
    await instance.settled();
    expect(instance.derivations().slice(before).map((each) => each.app)).toEqual(['askesis']);
    expect(instance.records()).toHaveLength(2);
    off();
  });
  it('derives again when the day turns over or the result is old, and not otherwise', async () => {
    const { instance, setClock } = store([provider('askesis', () => [entry('a1')])]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    const first = instance.derivations().length;
    await instance.settled();
    expect(instance.derivations().length).toBe(first);
    setClock(new Date('2026-11-05T12:03:00'));
    await instance.settled();
    expect(instance.derivations().length).toBe(first);
    setClock(new Date('2026-11-05T12:10:00'));
    await instance.settled();
    expect(instance.derivations().length).toBe(first + 1);
    setClock(new Date('2026-11-06T00:01:00'));
    await instance.settled();
    expect(instance.derivations().length).toBe(first + 2);
    off();
  });
  it('lists an entry once when two apps give the same key', async () => {
    const same = dynamisEntry('x1');
    const { instance } = store([provider('askesis', () => [entry('x1', { key: 'dynamis-workout:x1' })]), provider('dynamis', () => [same])]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.records().filter((record) => record.key === 'dynamis-workout:x1')).toHaveLength(1);
    off();
  });
  it('lets go of everything when the Library is left', async () => {
    const { instance } = store([provider('askesis', () => [entry('a1')])]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.records()).toHaveLength(1);
    off();
    expect(instance.records()).toEqual([]);
  });
  it('is told when a choice changes, so what shows is read again', async () => {
    const { instance, choose } = store([provider('askesis', () => [entry('a1')])]);
    let told = 0;
    const off = instance.subscribe(() => { told += 1; });
    await instance.settled();
    const before = told;
    choose();
    expect(told).toBe(before + 1);
    off();
  });
});

describe('what the store keeps', () => {
  it('writes nothing: browser storage and the device databases are unchanged after deriving and after leaving', async () => {
    localStorage.setItem('keep', 'this');
    const keys = () => JSON.stringify(Object.entries(localStorage));
    const databases = async () => JSON.stringify((await indexedDB.databases()).map((db) => db.name).sort());
    const before = [keys(), await databases()];
    const { instance } = store([provider('askesis', () => [entry('a1'), entry('a2')])]);
    const off = instance.subscribe(() => undefined);
    await instance.settled();
    expect(instance.records()).toHaveLength(2);
    expect([keys(), await databases()]).toEqual(before);
    off();
    expect([keys(), await databases()]).toEqual(before);
  });
});

describe('the device switch', () => {
  it('is off by default, on only when set, and off again at once', () => {
    expect(libraryProvidersOn()).toBe(false);
    setLibraryProviders(true);
    expect(localStorage.getItem('proairetosLibraryProviders')).toBe('on');
    expect(libraryProvidersOn()).toBe(true);
    setLibraryProviders(false);
    expect(libraryProvidersOn()).toBe(false);
    localStorage.setItem('proairetosLibraryProviders', 'yes');
    expect(libraryProvidersOn()).toBe(false);
  });
  it('is not in the synced or backed-up settings', async () => {
    const { syncedSetting } = await import('../../data/sync/deviceRecords');
    expect(syncedSetting('proairetosLibraryProviders')).toBe(false);
  });
  it('lists no app as a provider of the Library yet', () => {
    expect(providedLibraryApps()).toEqual([]);
  });
});

describe('useLibraryRecords', () => {
  const own: LifeRecord[] = [
    createLifeRecord({ key: 'reflection:rf1', kind: 'reflection', sourceApp: 'proairetos', source: 'Proairetos', sourceId: 'rf1', at: '2026-10-28T20:00:00.000Z', title: 'A reflection', valueIds: [], archived: false }),
    createLifeRecord({ key: 'reflection:rf2', kind: 'reflection', sourceApp: 'askesis', source: 'Askesis', sourceId: 'rf2', at: '2026-10-14T08:00:00.000Z', title: 'After the run', valueIds: [], archived: false }),
  ];
  const apps = (added: string[], owner: boolean) => {
    localStorage.setItem('proairetos.apps', JSON.stringify({ added }));
    if (owner) localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
    else localStorage.removeItem('proairetosOwned');
  };

  it('with the switch off gives back exactly what it was given, the same array, and starts nothing', async () => {
    apps([], true);
    const { result } = renderHook(() => useLibraryRecords(own));
    expect(result.current).toBe(own);
    await libraryStore.settled();
    expect(libraryStore.derivations()).toEqual([]);
    expect(libraryStore.records()).toEqual([]);
  });
  it('with the switch on hides the reflections written from an app’s prompt while that app is not added, and shows them again when it is', async () => {
    setLibraryProviders(true);
    apps([], true);
    const { result, rerender } = renderHook(() => useLibraryRecords(own));
    expect(result.current.map((record) => record.key)).toEqual(['reflection:rf1']);
    const { addApp } = await import('../../app/family/added');
    await act(async () => { addApp('askesis'); await libraryStore.settled(); });
    rerender();
    expect(result.current.map((record) => record.key)).toEqual(['reflection:rf1', 'reflection:rf2']);
  });
  it('with the switch on and an app not bought (no trial left), hides it too, and changes no record', () => {
    setLibraryProviders(true);
    apps(['askesis'], false);
    const frozen = JSON.stringify(own);
    const { result } = renderHook(() => useLibraryRecords(own));
    expect(result.current.map((record) => record.key)).toEqual(['reflection:rf1']);
    expect(JSON.stringify(own)).toBe(frozen);
  });
});
