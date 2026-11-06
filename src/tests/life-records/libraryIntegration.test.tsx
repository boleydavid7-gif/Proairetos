// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildLifeRecords, type LifeRecord } from '../../core/life-records';
import { mergeLibraryValueConnections } from '../../core/life-records/library';
import { libraryStore, useLibrarySource } from '../../app/providers/library';
import { providedLibraryApps, setLibraryProviders } from '../../app/providers/libraryPath';
import { moveToLibraryTrash, libraryTrash } from '../../app/library/trash';
import { notes } from '../../mneme/app/state';
import { COMPANIONS, STATES, gatherInput, put, seedCompanions } from './libraryFixtures';

/*
 * The Library page's integration (Slice 6, commit 4): the page asks `useLibrarySource`, which gathers its own records as ever, leaves out the
 * seven apps that give their entries through providers when the device switch is on, and lists theirs from the store. These tests use that
 * same hook, with the page's own function (`buildLifeRecords`) and the same records, so what they show is what the page lists.
 */
type Input = Awaited<ReturnType<typeof gatherInput>>;
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
beforeEach(async () => {
  await seedCompanions();
  STATES['every app added (the owner)']();
});
afterEach(() => { cleanup(); localStorage.clear(); });

const page = async () => {
  const input: Input = await gatherInput(study);
  const hook = renderHook(({ input }) => useLibrarySource((skip) => buildLifeRecords(input, skip), [input]), { initialProps: { input } });
  await act(async () => { await libraryStore.settled(); });
  hook.rerender({ input });
  return hook;
};
const keys = (records: readonly LifeRecord[]) => records.map((record) => record.key);
const COMPANION_KINDS = (record: LifeRecord) => (COMPANIONS as readonly string[]).includes(record.sourceApp);

describe('with the switch off, which is the default', () => {
  it('lists exactly what the page’s own gathering gives, and starts no store', async () => {
    const input = await gatherInput(study);
    const { result } = await page();
    expect(JSON.stringify(result.current)).toBe(JSON.stringify(buildLifeRecords(input)));
    expect(result.current).toHaveLength(19);
    expect(libraryStore.derivations()).toEqual([]);
    expect(libraryStore.records()).toEqual([]);
  });
});

describe('with the switch on', () => {
  beforeEach(() => setLibraryProviders(true));

  it('lists the same entries in the same order as the page’s own gathering', async () => {
    const input = await gatherInput(study);
    const { result } = await page();
    expect(JSON.stringify(result.current)).toBe(JSON.stringify(buildLifeRecords(input)));
  });
  it('leaves all seven providers’ apps out of the page’s own gathering, so no entry is listed twice', async () => {
    expect(providedLibraryApps().sort()).toEqual([...COMPANIONS].sort());
    const input = await gatherInput(study);
    expect(buildLifeRecords(input, new Set(providedLibraryApps())).filter((record) => COMPANION_KINDS(record) && record.kind !== 'reflection')).toEqual([]);
    const derived = libraryStore.derivations().length;
    const { result } = await page();
    expect(new Set(keys(result.current)).size).toBe(result.current.length);
    // The store is shared by the tests in this file, so only what this page made is counted.
    expect(libraryStore.derivations().slice(derived).map((each) => each.app).sort()).toEqual([...COMPANIONS].sort());
  });
  it('keeps saved items, value connections and Recently Deleted as they are: they are the Library’s, by key', async () => {
    const input = await gatherInput(study);
    const { result } = await page();
    const connections = [{ id: 'workout:a1', valueIds: ['v1'] }, { id: 'mneme:note:n1', valueIds: ['v2'] }];
    expect(JSON.stringify(mergeLibraryValueConnections(result.current, connections))).toBe(JSON.stringify(mergeLibraryValueConnections(buildLifeRecords(input), connections)));
    moveToLibraryTrash('workout:a1');
    expect(libraryTrash.get('workout:a1')).toBeTruthy();
    expect(keys(result.current)).toContain('workout:a1');
  });
  it('lists the same entries after a record changes in an app, once the store has caught up', async () => {
    const hook = await page();
    const before = keys(hook.result.current);
    put('dynamis:workout:w2', { id: 'w2', date: '2026-10-30', session: 'B', createdAt: '2026-10-30T18:00:00.000Z', minutes: 30, exercises: [{ exercise: 'row', name: 'Row', sets: [{ reps: 8 }] }] });
    await act(async () => { libraryStore.invalidate('dynamis'); await libraryStore.settled(); });
    hook.rerender({ input: await gatherInput(study) });
    expect(keys(hook.result.current)).toHaveLength(before.length + 1);
    expect(keys(hook.result.current)).toContain('dynamis-workout:w2');
  });
});

describe('Mneme’s archive, restore and deletion', () => {
  beforeEach(() => setLibraryProviders(true));

  it('archive and restore are the page’s own writes to the note, and the Library follows them', async () => {
    const hook = await page();
    const note = notes.get('n1')!;
    await act(async () => { notes.put({ ...note, archived: true, updatedAt: '2026-11-05T09:00:00.000Z' }); await libraryStore.settled(); });
    hook.rerender({ input: await gatherInput(study) });
    expect(hook.result.current.find((record) => record.key === 'mneme:note:n1')!.archived).toBe(true);
    await act(async () => { notes.put({ ...notes.get('n1')!, archived: false, updatedAt: '2026-11-05T09:10:00.000Z' }); await libraryStore.settled(); });
    hook.rerender({ input: await gatherInput(study) });
    expect(hook.result.current.find((record) => record.key === 'mneme:note:n1')!.archived).toBe(false);
  });
  it('"Remove from Reflect" marks the Library’s own row and leaves the note itself, which is still listed for the page to filter', async () => {
    const hook = await page();
    const before = JSON.stringify(notes.get('n1'));
    moveToLibraryTrash('mneme:note:n1');
    expect(libraryTrash.get('mneme:note:n1')).toBeTruthy();
    expect(JSON.stringify(notes.get('n1'))).toBe(before);
    expect(keys(hook.result.current)).toContain('mneme:note:n1');
  });
  it('a note deleted in Mneme leaves the Library, and its Recently Deleted row stays', async () => {
    const hook = await page();
    moveToLibraryTrash('mneme:note:n1');
    await act(async () => { notes.remove('n1'); await libraryStore.settled(); });
    hook.rerender({ input: await gatherInput(study) });
    expect(keys(hook.result.current)).not.toContain('mneme:note:n1');
    expect(libraryTrash.get('mneme:note:n1')).toBeTruthy();
  });
});

describe('an app that is removed, not bought, past its trial, or later available again', () => {
  beforeEach(() => setLibraryProviders(true));
  const owned = (trialUntil?: string) => put('proairetosOwned', { apps: [], account: true, ...(trialUntil ? { trialUntil } : {}) });
  const onlyOwn = (records: readonly LifeRecord[]) => records.filter((record) => !COMPANION_KINDS(record) || (record.kind === 'reflection' && record.sourceApp === 'proairetos'));

  it('contributes nothing when removed, when not bought with no trial left, and when the trial has ended', async () => {
    for (const apply of [
      () => STATES['every app removed (the owner)'](),
      () => STATES['apps added, not bought and no trial left'](),
      () => { put('proairetos.apps', { added: COMPANIONS }); owned('2026-01-01T00:00:00.000Z'); },
    ]) {
      apply();
      const { result, unmount } = await page();
      expect(result.current.filter(COMPANION_KINDS), JSON.stringify(result.current.filter(COMPANION_KINDS).map((r) => r.key))).toEqual([]);
      expect(keys(result.current)).not.toContain('reflection:rf2');
      expect(keys(result.current)).toContain('reflection:rf1');
      expect(keys(result.current)).toContain('decision:d1');
      expect(result.current.length).toBe(onlyOwn(result.current).length);
      unmount();
    }
  });
  it('is listed during a trial that is running', async () => {
    put('proairetos.apps', { added: COMPANIONS });
    owned(new Date(Date.now() + 5 * 86_400_000).toISOString());
    const { result } = await page();
    expect(result.current).toHaveLength(19);
  });
  it('comes back, with its reflections, when the app is added again, and no source record was touched', async () => {
    STATES['every app removed (the owner)']();
    const hook = await page();
    const gone = hook.result.current.length;
    const before = JSON.stringify(Object.entries(localStorage));
    expect(gone).toBeLessThan(19);
    const { addApp } = await import('../../app/family/added');
    await act(async () => { for (const app of COMPANIONS) addApp(app); await libraryStore.settled(); });
    hook.rerender({ input: await gatherInput(study) });
    expect(hook.result.current).toHaveLength(19);
    expect(keys(hook.result.current)).toContain('reflection:rf2');
    expect(JSON.stringify(Object.entries(localStorage).filter(([name]) => !name.startsWith('proairetos.apps')))).toBe(JSON.stringify(JSON.parse(before).filter(([name]: [string, string]) => !name.startsWith('proairetos.apps'))));
  });
});

describe('the lock', () => {
  it('shows the page only when unlocked, and the store runs only while the page is shown', async () => {
    const app = readFileSync('src/app/App.tsx', 'utf8');
    expect(app).toMatch(/route === 'connections' && !locked && <ConnectionsPage \/>/);
    setLibraryProviders(true);
    const idle = libraryStore.derivations().length;
    await libraryStore.settled();
    expect(libraryStore.derivations().length).toBe(idle);
    const hook = await page();
    expect(libraryStore.derivations().length).toBeGreaterThan(idle);
    const before = libraryStore.derivations().length;
    hook.unmount();
    expect(libraryStore.records()).toEqual([]);
    await libraryStore.settled();
    put('mneme:note:n9', { id: 'n9', title: 'New', body: 'x', pinned: true, archived: false, createdAt: '2026-11-05T10:00:00.000Z', updatedAt: '2026-11-05T10:00:00.000Z' });
    libraryStore.invalidate();
    await libraryStore.settled();
    expect(libraryStore.derivations().length).toBe(before);
  });
  it('is not touched by the page: the lock still guards the route, as the baseline records', () => {
    expect(readFileSync('src/app/lock/lock.ts', 'utf8')).toContain("export const lockedRoutes: readonly string[] = ['reflect', 'journal', 'insights', 'review'];");
  });
});
