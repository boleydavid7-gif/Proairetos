// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { orderLifeRecords, type LifeRecord } from '../../core/life-records';
import { libraryRecords, type Provider } from '../../core/providers';
import { hostContext } from '../../app/providers/context';
import { providedLibraryApps } from '../../app/providers/libraryPath';
import { libraryStore } from '../../app/providers/library';
import { ideas, notes } from '../../mneme/app/state';
import { mnemeLibrary } from '../../mneme/providers/library';
import { providerModules } from '../../app/providers/registry';
import { STATES, gather, seedCompanions } from './libraryFixtures';
import { createLifeRecord } from '../../core/life-records';

/*
 * The apps that give their Library entries through providers, old way and new way. The old way is the page's own gathering of every
 * source (`gather()`); the new way leaves those apps out of it (the skip list) and takes their entries from their providers, through the
 * host, with the Store's real availability. The two must list the same entries, field for field, in the same order, with nothing twice.
 */
const MOVED = ['askesis', 'dynamis', 'mneme', 'oikonomia', 'poreia', 'soma', 'theoria'];
const now = new Date('2026-11-05T12:00:00');

async function providers(): Promise<Provider<'library'>[]> {
  const modules = await Promise.all(providedLibraryApps().map((app) => providerModules[app]!()));
  return modules.flatMap((module) => module.providers).filter((provider): provider is Provider<'library'> => provider.capability === 'library');
}
// Study sessions as the page derives them, from the timer's blocks and focus events on this device (not plain values).
let study: Awaited<ReturnType<typeof realStudy>> = [];
async function realStudy() {
  const { lifeService } = await import('../../app/services');
  const { studySessions } = await import('../../app/praxis/study');
  const make = async (title: string, minutes: number) => {
    const block = await lifeService.capture(title, 'MAKE_TIME_FOR', { source: 'MANUAL', app: 'praxis' });
    await lifeService.recordFocus(block.id, minutes, { app: 'praxis' });
    return block;
  };
  await make('Biology', 40);
  const reading = await make('Read: Meditations', 20);
  await lifeService.recordFocus(reading.id, 15, { app: 'praxis' });
  const [blocks, events] = await Promise.all([lifeService.listForApp('praxis'), lifeService.historyForAll(true)]);
  return studySessions(blocks, events);
}
beforeAll(async () => { study = await realStudy(); }, 30_000);

async function viaProviders() {
  const skip = new Set<string>(providedLibraryApps());
  const rest = await gather(skip, study);
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
    const old = await gather(new Set(), study);
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
    expect((await gather(new Set(), study)).filter((record) => MOVED.includes(record.sourceApp) && record.kind !== 'reflection').length).toBeGreaterThan(0);
  });
  it('keep the owner, kind, source id and times of every entry, so the links to the app are the same', async () => {
    const old = new Map((await gather(new Set(), study)).map((record) => [record.key, record]));
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
    const own: LifeRecord[] = await gather(new Set(providedLibraryApps()), study);
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
    const before = [keys(), await databases(), JSON.stringify(await gather(new Set(), study))];
    await viaProviders();
    expect([keys(), await databases(), JSON.stringify(await gather(new Set(), study))]).toEqual(before);
  });
});

describe('Theoria’s study entries', () => {
  it('come from the timer’s blocks and focus events, with one reading entry for a book and a day, as the page shows them', async () => {
    const { given } = await viaProviders();
    const theoria = given.records.filter((record) => record.sourceApp === 'theoria');
    expect(theoria.map((record) => [record.title, record.detail]).sort()).toEqual([['Biology', '40 min · Study'], ['Read: Meditations', '35 min · Reading']]);
    expect(theoria.every((record) => record.kind === 'study' && record.source === 'Theoria')).toBe(true);
  });
});

describe('Mneme’s notes and ideas', () => {
  it('are only what was chosen: a note by inReflect ?? pinned, an idea by inReflect alone', async () => {
    const { given } = await viaProviders();
    const mneme = given.records.filter((record) => record.sourceApp === 'mneme').map((record) => record.key).sort();
    expect(mneme).toEqual(['mneme:idea:i1', 'mneme:note:n1', 'mneme:note:n2']);
    expect(JSON.stringify(given.records)).not.toMatch(/unselected|pinned-but-declined/);
  });
  it('follow the page’s own archive write, which stays in the page: the note is kept and listed as archived', async () => {
    const before = notes.get('n1')!;
    notes.put({ ...before, archived: true, updatedAt: '2026-11-05T09:00:00.000Z' });
    const { given, merged } = await viaProviders();
    expect(given.records.find((record) => record.key === 'mneme:note:n1')!.archived).toBe(true);
    expect(JSON.stringify(merged)).toBe(JSON.stringify(await gather(new Set(), study)));
    expect(notes.get('n1')).toMatchObject({ id: 'n1', body: before.body, archived: true });
    expect(ideas.get('i1')).toBeTruthy();
  });
  it('tell the store when a note changes, so a note archived in the page is read again', () => {
    let told = 0;
    const off = mnemeLibrary.subscribe!(() => { told += 1; });
    const note = notes.get('n2')!;
    notes.put({ ...note, archived: false, updatedAt: '2026-11-05T09:30:00.000Z' });
    off();
    expect(told).toBeGreaterThan(0);
  });
  it('and Theoria’s, with reflections attributed to either, are hidden while the app is not available, and nothing is changed', async () => {
    STATES['every app removed (the owner)']();
    const { given } = await viaProviders();
    expect(given.records.filter((record) => record.sourceApp === 'mneme' || record.sourceApp === 'theoria')).toEqual([]);
    const reflection = (id: string, sourceApp: 'mneme' | 'theoria', source: 'Mneme' | 'Theoria') => createLifeRecord({ key: `reflection:${id}`, kind: 'reflection', sourceApp, source, sourceId: id, at: '2026-10-20T08:00:00.000Z', title: `From ${source}`, valueIds: [], archived: false });
    const own: LifeRecord[] = [reflection('rm', 'mneme', 'Mneme'), reflection('rt', 'theoria', 'Theoria')];
    const frozen = JSON.stringify(own);
    expect(libraryStore.visible(own)).toEqual([]);
    expect(JSON.stringify(own)).toBe(frozen);
    STATES['every app added (the owner)']();
    expect(libraryStore.visible(own).map((record) => record.key)).toEqual(['reflection:rm', 'reflection:rt']);
  });
});

describe('Poreia’s trips and journal', () => {
  it('are only completed trips and their journal: not an upcoming trip, its journal, a booking, a code or an address', async () => {
    const { given } = await viaProviders();
    const poreia = given.records.filter((record) => record.sourceApp === 'poreia');
    expect(poreia.map((record) => record.key).sort()).toEqual(['poreia:trip:j1:journal', 'poreia:trip:r1']);
    expect(poreia.map((record) => [record.title, record.detail])).toEqual(expect.arrayContaining([['Lisbon', 'Lisbon, Portugal · 2026-09-10 – 2026-09-16'], ['Tram 28', 'Lisbon · Memory · Alfama']]));
    expect(JSON.stringify(poreia)).not.toMatch(/Porto|upcoming|TP 237|CANARY/);
  });
  it('keep their dates and the day a trip becomes completed, which is the person’s day', async () => {
    const { given } = await viaProviders();
    expect(given.records.find((record) => record.key === 'poreia:trip:r1')!.at).toBe('2026-09-16T12:00:00');
    const later = await libraryRecords(await providers(), APPS, { ...hostContext(new Date('2026-12-20T12:00:00')), today: '2026-12-20' });
    expect(later.records.filter((record) => record.sourceApp === 'poreia').map((record) => record.key).sort()).toEqual(['poreia:trip:j1:journal', 'poreia:trip:j2:journal', 'poreia:trip:r1', 'poreia:trip:r2']);
  });
});

describe('Oikonomia’s milestones', () => {
  it('are only the ones the person chose for Reflect, with the words they wrote and nothing about money', async () => {
    const { given } = await viaProviders();
    const milestones = given.records.filter((record) => record.sourceApp === 'oikonomia');
    expect(milestones.map((record) => [record.key, record.title, record.body, record.at])).toEqual([['oikonomia:financial:m1', 'Paid off the card', 'Wrote this down for myself.', '2026-10-30T12:00:00']]);
    expect(JSON.stringify(milestones)).not.toMatch(/unselected|CANARY/);
  });
  it('read no financial record: bills in the database are not touched, and a bill’s amount cannot reach an entry', async () => {
    const { deviceDatabase } = await import('../../app/services');
    const db = (await deviceDatabase)!;
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction('oikonomiaBills', 'readwrite').objectStore('oikonomiaBills').put({ id: 'b1', name: 'CANARY-Rent', amountCents: 987654, currency: 'USD', dueDate: '2026-11-05', frequency: 'monthly', autopay: false, reminderDays: 3, notes: 'CANARY-note', payments: [], createdAt: '', updatedAt: '' });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const { given } = await viaProviders();
    expect(JSON.stringify(given.records)).not.toMatch(/CANARY|9876|Rent/);
  });
});
