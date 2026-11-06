// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { LifeRecord } from '../../core/life-records';
import { groupLifeRecordsByYear } from '../../core/life-records/library';

/*
 * The Library baseline (Phase 3, Slice 6, commit 0). It records what the Library lists today, before any change: every field of every
 * entry in the order the page shows them, the entries each companion source gives, what is left out (a note or idea or milestone the
 * person did not choose for Reflect, an upcoming trip, a booking), what the lock does to the page, and what happens to a removed,
 * trial-ended or unbought app's records. Companion records come from the stores the page reads (browser storage and the device database); the
 * records of Proairetos itself and the study sessions (which the page derives from items and events) are given as plain values. Written
 * with LIBRARY_BASELINE=write; compared otherwise, one file a time zone. No application code is touched.
 */
const zone = process.env.TZ || 'UTC';
const FILE = resolve(process.cwd(), 'src/tests/life-records/fixtures', `libraryBaseline.${zone.replace(/\W+/g, '-').toLowerCase()}.json`);
import { COMPANIONS, STATES, gather, seedCompanions } from './libraryFixtures';

const rowOf = (record: LifeRecord) => ({ key: record.key, kind: record.kind, sourceApp: record.sourceApp, source: record.source, sourceId: record.sourceId, at: record.at, title: record.title, detail: record.detail ?? null, body: record.body ?? null, searchText: record.searchText, valueIds: record.valueIds, archived: record.archived });

describe('Library baseline', () => {
  const result: Record<string, unknown> = {};
  let listed: LifeRecord[] = [];
  const perState: Record<string, { added: Record<string, boolean>; keys: string[] }> = {};

  beforeAll(async () => {
    const { isAdded } = await import('../../app/family/added');
    for (const [name, apply] of Object.entries(STATES)) {
      await seedCompanions();
      apply();
      const records = await gather();
      perState[name] = { added: Object.fromEntries(COMPANIONS.map((app) => [app, isAdded(app)])), keys: records.map((record) => record.key) };
      if (name.startsWith('every app added')) listed = records;
    }
    const lock = await import('../../app/lock/lock');
    result.records = listed.map(rowOf);
    result.byYearAndMonth = groupLifeRecordsByYear(listed).map((year) => ({ year: year.key, count: year.records.length, months: year.months.map((month) => ({ month: month.key, keys: month.records.map((record) => record.key) })) }));
    result.bySource = Object.fromEntries([...new Set(listed.map((record) => record.sourceApp))].sort().map((app) => [app, listed.filter((record) => record.sourceApp === app).map((record) => record.key)]));
    result.appStates = perState;
    result.lock = {
      lockedRoutes: [...lock.lockedRoutes],
      libraryRouteIsInLockedRoutes: lock.lockedRoutes.includes('connections'),
      pageGate: /route === 'connections' && !locked && <ConnectionsPage \/>/.test(readFileSync('src/app/App.tsx', 'utf8')),
      lockScreenForLibraryRoute: /\{locked && lockedRoutes\.includes\(route\) && <LockScreen \/>\}/.test(readFileSync('src/app/App.tsx', 'utf8')) && !lock.lockedRoutes.includes('connections'),
    };
  }, 60_000);

  it('lists the entries of every source the page reads, newest first, and only what was chosen for Reflect', () => {
    const sources = new Set(listed.map((record) => record.sourceApp));
    for (const app of ['proairetos', 'compass', 'askesis', 'dynamis', 'soma', 'theoria', 'mneme', 'poreia', 'oikonomia']) expect(sources.has(app as never), app).toBe(true);
    const sorted = [...listed].sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
    expect(listed.map((record) => record.key)).toEqual(sorted.map((record) => record.key));
    expect(JSON.stringify(listed)).not.toMatch(/CANARY/);
  });
  it('lists the same records whether an app is added, removed, or not bought: the Library does not look at the Store today', () => {
    const [all, removed, unbought] = Object.values(perState);
    expect(Object.values(all.added).every(Boolean)).toBe(true);
    expect(Object.values(removed.added).some(Boolean)).toBe(false);
    expect(Object.values(unbought.added).some(Boolean)).toBe(false);
    expect(removed.keys).toEqual(all.keys);
    expect(unbought.keys).toEqual(all.keys);
    expect(all.keys).toHaveLength(19); // 6 of Proairetos itself, 2 runs, 1 strength session, 2 meals, 2 study entries, 3 from Mneme, 2 from Poreia, 1 milestone
  });
  it('hides the whole page while the lock is on: its route is not one the lock screen covers, and the page renders only when unlocked', () => {
    expect((result.lock as { pageGate: boolean }).pageGate).toBe(true);
    expect((result.lock as { libraryRouteIsInLockedRoutes: boolean }).libraryRouteIsInLockedRoutes).toBe(false);
  });
  it('matches the recorded baseline', () => {
    if (process.env.LIBRARY_BASELINE === 'write') {
      writeFileSync(FILE, JSON.stringify(result, null, 2) + '\n');
      return;
    }
    expect(existsSync(FILE), `no baseline for ${zone}`).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  });
});
