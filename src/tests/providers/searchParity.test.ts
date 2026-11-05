// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/*
 * Universal search now reaches each app through a provider. What it finds must be what it found before, except for the
 * changes the owner decided (docs/PHASE3_PLAN.md D2 to D4), and every such change is listed here, by app, so none is
 * silent. `fixtures/searchBaseline.json` is the output of the code before any provider existed (commit ebd00fbb), run on
 * the seed below. Nothing here masks a difference: a row that moved, vanished or lost a field without being listed fails.
 */
const day = '2026-11-01T09:00:00.000Z';
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

async function seed() {
  localStorage.setItem('proairetos.onboarded', 'yes');
  localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['core'], owner: true, account: true }));
  localStorage.setItem('proairetos.apps', JSON.stringify({ added: ['askesis', 'soma', 'oikonomia', 'hydros', 'poreia', 'theoria', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'melete', 'mneme'] }));
  put('philia:person:p1', { id: 'p1', name: 'Mara', relation: 'Sister', notes: [{ id: 'n', text: 'Likes lemon cake' }], gifts: [{ id: 'g', text: 'Linen apron' }], times: [{ id: 't', text: 'Lake weekend' }], createdAt: day });
  put('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'Use the green cloth', createdAt: day });
  put('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: '50 mg', note: 'Take with food', createdAt: day });
  put('therapeia:visit:v1', { id: 'v1', with: 'Dr Lee', where: 'Clinic', notes: 'Blood pressure talk', questions: [{ id: 'q', text: 'Ask about sleep' }], createdAt: day });
  put('ktema:thing:t1', { id: 't1', name: 'Dishwasher', make: 'Bosch', model: 'S100', serial: 'SN-4455-XY', place: 'Kitchen', note: 'Under warranty', createdAt: day });
  put('ktema:upkeep:u1', { id: 'u1', name: 'Clean the filter', note: 'Every three months', createdAt: day });
  put('phyton:plant:pl1', { id: 'pl1', name: 'Fern', species: 'boston-fern', place: 'Hall', note: 'Likes shade', createdAt: day });
  put('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, notes: 'Spring trip', createdAt: day });
  put('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'stay', title: 'Hotel Alfama', provider: 'Booking', confirmation: 'ABC123XYZ', createdAt: day });
  put('poreia:plan:pn1', { id: 'pn1', tripId: 'tr1', title: 'Tram 28', where: 'Alfama', note: 'Go early', createdAt: day });
  put('dynamis:workout:w1', { id: 'w1', date: '2026-10-30', note: 'Felt strong', createdAt: day });
  put('melete:subject:s1', { id: 's1', name: 'Biology', dates: [{ title: 'Exam' }], materials: [{ title: 'Chapter 4' }], ifThen: 'After lunch', createdAt: day });
  put('mneme:note:n1', { id: 'n1', title: 'Garden ideas', body: 'Plant beans', updatedAt: day, archived: false });
  const { openDatabase, stores } = await import('../../data/storage/indexeddb/database');
  const db = await openDatabase();
  if (!db) throw new Error('no database');
  const write = (store: string, record: unknown) =>
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  await write(stores.somaRecipes, { id: 'r1', title: 'Lentil soup', ingredients: ['1 cup lentils', 'carrot'], notes: 'Add lemon', tags: ['soup'], createdAt: day });
  await write(stores.theoriaBooks, { id: 'bk1', title: 'Meditations', author: 'Marcus Aurelius', highlights: [{ id: 'h', text: 'You have power over your mind' }], notes: [{ id: 'nt', body: 'Re-read book two' }], updatedAt: day });
  await write(stores.askesisWorkouts, { id: 'e1', activity: 'run', date: '2026-10-20', notes: 'Felt easy', wentWell: 'Pacing', nextTime: 'Longer', intention: 'Stay loose', createdAt: day });
  await write(stores.oikonomiaBills, { id: 'bill1', name: 'Internet', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-10', frequency: 'monthly', category: 'Home', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE account 1234', payments: [], createdAt: day, updatedAt: day });
}


type Row = { id: string; kind: string; title: string; href?: string; at: string; label?: string; fields: string[] };
const baseline = JSON.parse(readFileSync('src/tests/providers/fixtures/searchBaseline.json', 'utf8')) as Row[];

/** Rows the owner's rules take out of search altogether (app label -> why). */
const REMOVED: Record<string, string> = {};
/** Field texts the owner's rules take out of a row (row label -> texts that no longer appear). */
const DROPPED_FIELDS: Record<string, string[]> = {
  'Chore in Ergon': ["Use the green cloth"],};
/** Rows for apps whose own test covers them (Oikonomia: Slice 1; Hydros did not exist). */
const COVERED_ELSEWHERE = new Set(['Bill in Oikonomia']);

const compare = (a: Row, b: Row) => `${a.label}|${a.title}|${a.href}`.localeCompare(`${b.label}|${b.title}|${b.href}`);
const expected = (): Row[] =>
  baseline
    .filter((row) => !COVERED_ELSEWHERE.has(row.label ?? '') && !(row.label && row.label in REMOVED))
    .map(({ id: _id, ...row }) => ({ ...row, id: '', fields: row.fields.filter((text) => !(DROPPED_FIELDS[row.label ?? ''] ?? []).includes(text)) }))
    .sort(compare);

describe('universal search outside Oikonomia and Hydros', () => {
  // The clock is fixed so "Today" and "Yesterday" in a title cannot depend on the day the test runs.
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-05T12:00:00') });
    await seed();
  }, 30_000);
  afterAll(() => vi.useRealTimers());
  it('finds what it found before, except what the owner’s rules remove', async () => {
    const { gatherAll } = await import('../../features/search/SearchSheet');
    const { things, labels } = await gatherAll();
    const rows = things
      .filter((thing) => !COVERED_ELSEWHERE.has(labels.get(thing.id) ?? '') || (labels.get(thing.id) ?? '').endsWith('Hydros'))
      .map((thing) => ({ id: '', kind: thing.kind, title: thing.title, href: thing.href, at: thing.at, label: labels.get(thing.id), fields: thing.fields.map((field) => field.text).filter((text): text is string => Boolean(text)) }))
      .sort(compare);
    expect(rows).toEqual(expected());
  }, 30_000);

  it('shows an Oikonomia bill by name, due date and paid status only, and opens that bill', async () => {
    const { gatherAll: gather } = await import('../../features/search/SearchSheet');
    const { search } = await import('../../core/search/search');
    const { things, labels } = await gather();
    const bills = things.filter((thing) => labels.get(thing.id) === 'Bill in Oikonomia');
    expect(bills).toHaveLength(1);
    expect(bills[0].title).toBe('Internet');
    expect(bills[0].href).toBe('/oikonomia/?open=bill%3Abill1');
    expect(bills[0].fields.map((field) => field.name).sort()).toEqual(['due date', 'paid status']);
    expect(JSON.stringify(bills[0])).not.toMatch(/CANARY|98765432|987654|1234|Home/);
    // A note-only match is gone; the name still finds it.
    expect(search('CANARY-NOTE', things).filter((hit) => labels.get(hit.id) === 'Bill in Oikonomia')).toEqual([]);
    expect(search('account 1234', things).filter((hit) => labels.get(hit.id) === 'Bill in Oikonomia')).toEqual([]);
    expect(search('internet', things).filter((hit) => labels.get(hit.id) === 'Bill in Oikonomia')).toHaveLength(1);
  });

  it('keeps Hydros out of search until it is turned on', async () => {
    const { gatherAll: gather } = await import('../../features/search/SearchSheet');
    const { openDatabase, stores } = await import('../../data/storage/indexeddb/database');
    const db = (await openDatabase())!;
    const when = new Date();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(stores.hydrosDrinks, 'readwrite');
      tx.objectStore(stores.hydrosDrinks).put({ id: 'd1', kind: 'tea', label: 'Hibiscus tea', amountOz: 12, caffeineMg: 31337, loggedAt: when.toISOString(), createdAt: when.toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const hydros = async () => {
      const { things, labels } = await gather();
      return things.filter((thing) => (labels.get(thing.id) ?? '').endsWith('Hydros'));
    };
    expect(await hydros()).toEqual([]);
    const { setProviderEnabled } = await import('../../data/storage/preferences');
    setProviderEnabled('hydros', 'search', true);
    const on = await hydros();
    expect(on.map((thing) => thing.title)).toContain('Hibiscus tea');
    expect(JSON.stringify(on)).not.toMatch(/31337|caffeine/i);
    setProviderEnabled('hydros', 'search', false);
    expect(await hydros()).toEqual([]);
  });
});
