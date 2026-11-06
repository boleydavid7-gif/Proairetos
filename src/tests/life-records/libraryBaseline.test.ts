// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildLifeRecords, type LifeRecord } from '../../core/life-records';
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
const TODAY = '2026-11-05';
const stamp = '2026-09-01T10:00:00.000Z';
const COMPANIONS = ['askesis', 'dynamis', 'soma', 'theoria', 'mneme', 'poreia', 'oikonomia'] as const;

const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

async function seedCompanions() {
  localStorage.clear();
  put('askesis:settings', { unit: 'mi' });
  put('dynamis:setup', { aim: 'strength', place: 'gym', isNew: false, days: [1, 3, 5], sets: 3, setsSince: '2026-09-01', unit: 'lb', startedOn: '2026-09-01', steps: {}, at: '17:30' });
  put('dynamis:workout:w1', { id: 'w1', date: '2026-10-12', session: 'A', createdAt: '2026-10-12T18:30:00.000Z', minutes: 48, felt: 'good', note: 'Right knee felt fine.', exercises: [{ exercise: 'squat', name: 'Back squat', sets: [{ reps: 5, weight: 135 }, { reps: 5, weight: 145 }] }, { exercise: 'row', name: 'Row', sets: [{ reps: 8 }] }, { exercise: 'press', name: 'Press', sets: [] }] });
  put('mneme:note:n1', { id: 'n1', title: 'Chosen note', body: 'A note chosen for Reflect.\nSecond line.', pinned: false, inReflect: true, archived: false, source: 'voice', kind: 'note', transcript: { segments: [{ start: 0, end: 1, text: 'spoken words' }], at: stamp }, createdAt: '2026-10-20T08:00:00.000Z', updatedAt: stamp });
  put('mneme:note:n2', { id: 'n2', title: 'Old pinned note', body: 'Pinned before choosing existed.', pinned: true, archived: true, createdAt: '2026-08-02T08:00:00.000Z', updatedAt: stamp });
  put('mneme:note:n3', { id: 'n3', title: 'Not chosen', body: 'CANARY-unselected-note', pinned: false, inReflect: false, archived: false, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: stamp });
  put('mneme:note:n4', { id: 'n4', title: '', body: 'CANARY-pinned-but-declined', pinned: true, inReflect: false, archived: false, createdAt: '2026-10-22T08:00:00.000Z', updatedAt: stamp });
  put('mneme:idea:i1', { id: 'i1', text: 'An idea chosen for Reflect\nwith more words', stage: 'shape', inReflect: true, createdAt: '2026-10-25T08:00:00.000Z', updatedAt: stamp });
  put('mneme:idea:i2', { id: 'i2', text: 'CANARY-unselected-idea', stage: 'spark', createdAt: '2026-10-26T08:00:00.000Z', updatedAt: stamp });
  put('poreia:trip:r1', { id: 'r1', name: 'Lisbon', place: { name: 'Lisbon', label: 'Lisbon, Portugal', country: 'Portugal', countryCode: 'PT' }, start: '2026-09-10', end: '2026-09-16', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
  put('poreia:trip:r2', { id: 'r2', name: 'Porto (upcoming)', place: { name: 'Porto', label: 'Porto, Portugal', country: 'Portugal', countryCode: 'PT' }, start: '2026-12-10', end: '2026-12-12', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
  put('poreia:journal:j1', { id: 'j1', tripId: 'r1', date: '2026-09-12', kind: 'memory', title: 'Tram 28', text: 'Rode the tram up the hill.', place: 'Alfama', createdAt: stamp, updatedAt: stamp });
  put('poreia:journal:j2', { id: 'j2', tripId: 'r2', date: '2026-12-10', kind: 'day', text: 'CANARY-upcoming-journal', createdAt: stamp, updatedAt: stamp });
  put('poreia:booking:b1', { id: 'b1', tripId: 'r1', kind: 'flight', title: 'TP 237', confirmation: 'CANARYCODE', address: 'CANARY-street', startDate: '2026-09-10', createdAt: stamp, updatedAt: stamp });
  put('oikonomia:reflect-milestone:m1', { id: 'm1', title: 'Paid off the card', body: 'Wrote this down for myself.', date: '2026-10-30', inReflect: true, createdAt: stamp, updatedAt: stamp });
  put('oikonomia:reflect-milestone:m2', { id: 'm2', title: 'CANARY-unselected-milestone', date: '2026-10-31', inReflect: false, createdAt: stamp, updatedAt: stamp });
  const { deviceDatabase } = await import('../../app/services');
  const db = (await deviceDatabase)!;
  const write = (store: string, record: unknown) =>
    new Promise<void>((resolveWrite, reject) => {
      const request = db.transaction(store, 'readwrite').objectStore(store).put(record);
      request.onsuccess = () => resolveWrite();
      request.onerror = () => reject(request.error);
    });
  await write('askesisWorkouts', { id: 'a1', date: '2026-10-14', activity: 'run', meters: 5230, seconds: 1750, avgHr: 151, felt: 'easy', notes: 'River loop.', wentWell: 'Steady pace', nextTime: 'Start slower', intention: 'Relax the shoulders', shoeId: 'CANARY-shoe', workoutTitle: 'Easy run', createdAt: '2026-10-14T07:10:00.000Z' });
  await write('askesisWorkouts', { id: 'a2', date: '2026-10-18', activity: 'walk', seconds: 2400, createdAt: '2026-10-18T09:00:00.000Z' });
  await write('somaRecipes', { id: 'rc1', title: 'Lentil soup', notes: 'Less salt next time.', tags: ['soup'], ingredients: ['lentils', 'carrot'], source: 'Grandma', cookedFor: { '2026-10-10': ['Mia', 'Tomas', 'Ana'], '2026-10-24': ['Mia'], '2026-10-25': [] }, createdAt: stamp, updatedAt: stamp });
}

// What the page gives Proairetos's own records and the study sessions: plain values, since these sources do not move in Slice 6.
const NATIVE = {
  reflections: [
    { id: 'rf1', kind: 'FREE', body: 'A reflection from the journal.\nMore words.', valueIds: ['v1'], createdAt: '2026-10-28T20:00:00.000Z' },
    { id: 'rf2', kind: 'FREE', promptKey: 'after-run', body: 'A line after the run.', createdAt: '2026-10-14T08:00:00.000Z' },
    { id: 'rf3', kind: 'INTENTION', body: 'An archived intention.', createdAt: '2026-10-01T08:00:00.000Z', archivedAt: '2026-10-02T08:00:00.000Z' },
  ],
  decisions: [{ id: 'd1', question: 'Take the new role?', options: ['Yes', 'No'], choice: 'Yes', reasons: 'More room to learn.', expected: 'A harder year', valueNotes: { v1: 'Learning' }, decidedAt: '2026-10-05T12:00:00.000Z' }],
  pursuits: [{ id: 'p1', title: 'Run a 10K', status: 'active', area: 'Health', outcome: 'Finish', why: 'Energy', current: 'Week 3', nextMove: 'Long run Sunday', valueNotes: { v1: 'x' }, createdAt: '2026-09-15T08:00:00.000Z', updatedAt: stamp }],
  items: [{ id: 'it1', type: 'DO', status: 'OPEN', title: 'Call the bank', notes: 'Ask about the form.', nextStep: 'Find the number', valueIds: ['v1'], createdAt: '2026-10-29T08:00:00.000Z' }],
  study: [
    { id: 's1', itemId: 'b1', title: 'Biology', minutes: 40, at: '2026-10-27T15:00:00.000Z', kind: 'study' as const },
    { id: 's2', itemId: 'b2', title: 'Read: Meditations', minutes: 20, at: '2026-10-27T21:00:00.000Z', kind: 'reading' as const },
    { id: 's3', itemId: 'b2', title: 'Read: Meditations', minutes: 15, at: '2026-10-27T22:00:00.000Z', kind: 'reading' as const },
  ],
};

async function gather(): Promise<LifeRecord[]> {
  const { readRuns } = await import('../../app/askesis/runs');
  const { readRecipes } = await import('../../app/soma/meals');
  const { combineReadingSessions } = await import('../../app/praxis/study');
  const { plan, workouts } = await import('../../dynamis/app/state');
  const { notes, ideas } = await import('../../mneme/app/state');
  const { trips, journal } = await import('../../poreia/app/state');
  const { reflectMilestones } = await import('../../oikonomia/data/reflect');
  const runs = await readRuns();
  return buildLifeRecords({
    reflections: NATIVE.reflections as never,
    decisions: NATIVE.decisions as never,
    pursuits: NATIVE.pursuits as never,
    items: NATIVE.items as never,
    workouts: runs.workouts,
    distanceUnit: runs.unit,
    strengthWorkouts: workouts.list(),
    strengthUnit: plan.load().unit ?? 'kg',
    recipes: await readRecipes(),
    studySessions: combineReadingSessions(NATIVE.study),
    mnemeNotes: notes.list(),
    mnemeIdeas: ideas.list(),
    poreiaTrips: trips.list(),
    poreiaJournal: journal.list(),
    poreiaToday: TODAY,
    oikonomiaMilestones: reflectMilestones.list(),
  });
}

const STATES = {
  'every app added (the owner)': () => { put('proairetos.apps', { added: COMPANIONS }); put('proairetosOwned', { apps: ['core'], owner: true, account: true }); },
  'every app removed (the owner)': () => { put('proairetos.apps', { added: [] }); put('proairetosOwned', { apps: ['core'], owner: true, account: true }); },
  'apps added, not bought and no trial left': () => { put('proairetos.apps', { added: COMPANIONS }); localStorage.removeItem('proairetosOwned'); },
} as const;

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
