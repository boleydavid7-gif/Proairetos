// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APPS } from '../../core/apps';
import { homeRows, type HomeRow, type HostContext, type Provider } from '../../core/providers';

/*
 * What each app puts on Today. A canary value sits in every field a line must not carry; none may appear in any line.
 * Records are placed as the app keeps them (browser storage by key, or the device's database) and read through the same
 * calls the device uses.
 */
const TODAY = '2026-11-05'; // a Thursday
const day = '2026-11-01T09:00:00.000Z';
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const records: Record<string, unknown[]> = {};
const ctx = (extra: Partial<HostContext> = {}): HostContext => ({
  today: TODAY,
  now: new Date(`${TODAY}T12:00:00`),
  day: { start: new Date(`${TODAY}T00:00:00`), end: new Date('2026-11-06T00:00:00') },
  records: async <T,>(source: string) => {
    if (!source.startsWith('local:')) return (records[source] ?? []) as T[];
    const prefix = source.slice(6);
    const out: T[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) out.push(JSON.parse(localStorage.getItem(key) ?? 'null') as T);
    }
    return out;
  },
  setting: (key: string) => localStorage.getItem(key),
  schedule: async () => [],
  daySettings: () => ({ startHour: 0, followShifts: true }),
  isUsable: () => true,
  enabled: () => true,
  ...extra,
} as HostContext);
const lines = async (provider: Provider<'home'>, extra: Partial<HostContext> = {}): Promise<HomeRow[]> => {
  const out = await homeRows([provider], APPS, ctx(extra));
  expect(out.rejected).toEqual([]);
  return out.rows;
};
const text = (rows: unknown) => JSON.stringify(rows);
beforeEach(() => {
  localStorage.clear();
  for (const key of Object.keys(records)) delete records[key];
});

describe('Philia on Today', () => {
  const person = (id: string, name: string, birthday: string, extra: Record<string, unknown> = {}) => ({ id, name, birthday, phone: 'CANARY-PHONE', email: 'canary@example.test', notes: [{ id: 'n', text: 'CANARY-NOTE' }], gifts: [{ id: 'g', text: 'CANARY-GIFT' }], times: [], createdAt: day, ...extra });
  it('says who has a birthday this week, never phone, email, notes or gifts', async () => {
    const { philiaHome } = await import('../../philia/providers/home');
    put('philia:person:p1', person('p1', 'Mara', '11-08'));
    const rows = await lines(philiaHome);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ group: 'attention', title: 'Mara’s birthday in 3 days', detail: 'Coming up', open: '/philia/?open=person%3Ap1', icon: 'person', notForMe: 'birthdays' });
    expect(rows[0].swipe?.id).toBe('birthdays:p1@2026-11-08');
    expect(text(rows)).not.toMatch(/CANARY|canary/);
  });
  it('folds several into one line that opens Philia', async () => {
    const { philiaHome } = await import('../../philia/providers/home');
    put('philia:person:p1', person('p1', 'Mara', '11-08'));
    put('philia:person:p2', person('p2', 'Tomas', '11-09'));
    put('philia:person:p3', person('p3', 'Ada', '11-10'));
    const rows = await lines(philiaHome);
    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toBe('And 1 more');
    expect(rows[0].open).toBe('/philia/');
  });
  it('shows nothing when no date is within the week, and follows an edit and a deletion', async () => {
    const { philiaHome } = await import('../../philia/providers/home');
    put('philia:person:p1', person('p1', 'Mara', '12-25'));
    expect(await lines(philiaHome)).toEqual([]);
    put('philia:person:p1', person('p1', 'Mara', '11-07'));
    expect((await lines(philiaHome))[0].title).toBe('Mara’s birthday in 2 days');
    localStorage.removeItem('philia:person:p1');
    expect(await lines(philiaHome)).toEqual([]);
  });
  it('is not run for an app that is not added or is set aside', async () => {
    const { philiaHome } = await import('../../philia/providers/home');
    put('philia:person:p1', person('p1', 'Mara', '11-08'));
    expect(await lines(philiaHome, { isUsable: () => false })).toEqual([]);
    expect(await lines(philiaHome, { enabled: () => false })).toEqual([]);
  });
});

describe('Oikonomia on Today', () => {
  const bill = (id: string, name: string, dueDate: string, extra: Record<string, unknown> = {}) => ({ id, name, amountCents: 98765432, currency: 'USD', dueDate, frequency: 'monthly', category: 'CANARY-AREA', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE', payments: [], createdAt: day, updatedAt: day, ...extra });
  it('says which bills are due in the next days, by name and first date, never the amount or notes', async () => {
    const { oikonomiaHome } = await import('../../oikonomia/providers/home');
    records.oikonomiaBills = [bill('b1', 'Internet', '2026-11-07')];
    const rows = await lines(oikonomiaHome);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Internet', open: '/oikonomia/?open=bill:b1', icon: 'list', notForMe: 'bills' });
    expect(rows[0].detail).toMatch(/^Due (Nov 7|7 Nov)$/);
    expect(rows[0].swipe).toEqual({ id: 'bills:b1@2026-11-07', label: 'Internet' });
    expect(text(rows)).not.toMatch(/CANARY|98765432|USD/);
  });
  it('folds several into one line that opens Oikonomia, and leaves out a paid bill and one not yet near', async () => {
    const { oikonomiaHome } = await import('../../oikonomia/providers/home');
    records.oikonomiaBills = [
      bill('b1', 'Internet', '2026-11-06'), bill('b2', 'Rent', '2026-11-07'), bill('b3', 'Phone', '2026-11-08'),
      bill('b4', 'Water', '2026-11-06', { payments: [{ id: 'p', date: '2026-11-06', amountCents: 1 }] }), bill('b5', 'Far', '2026-12-20'),
    ];
    const rows = await lines(oikonomiaHome);
    expect(rows[0].title).toBe('Internet, Rent +1');
    expect(rows[0].open).toBe('/oikonomia/');
    expect(rows[0].swipe?.label).toBe('Internet, Rent');
  });
  it('shows nothing when nothing is due, and follows a payment', async () => {
    const { oikonomiaHome } = await import('../../oikonomia/providers/home');
    records.oikonomiaBills = [bill('b1', 'Internet', '2026-12-20')];
    expect(await lines(oikonomiaHome)).toEqual([]);
    records.oikonomiaBills = [bill('b1', 'Internet', '2026-11-07')];
    expect(await lines(oikonomiaHome)).toHaveLength(1);
    records.oikonomiaBills = [bill('b1', 'Internet', '2026-11-07', { payments: [{ id: 'p', date: '2026-11-07', amountCents: 1 }] })];
    expect(await lines(oikonomiaHome)).toEqual([]);
  });
});

describe('Ktema on Today', () => {
  const thing = (extra: Record<string, unknown> = {}) => ({ id: 't1', name: 'Dishwasher', category: 'Appliance', serial: 'CANARY-SERIAL', price: 'CANARY-PRICE', warrantyUntil: '2030-01-01', note: 'CANARY-THING', createdAt: day, ...extra });
  const upkeep = (id: string, name: string, start: string, extra: Record<string, unknown> = {}) => ({ id, thingId: 't1', name, note: 'CANARY-UPKEEP', every: { count: 3, unit: 'months' }, start, history: [], createdAt: day, ...extra });
  it('says which upkeep has come round, with its thing and since when, nothing else', async () => {
    const { ktemaHome } = await import('../../ktema/providers/home');
    put('ktema:thing:t1', thing());
    put('ktema:upkeep:u1', upkeep('u1', 'Clean the filter', '2026-11-01'));
    put('ktema:upkeep:u2', upkeep('u2', 'Not yet', '2026-12-20'));
    const rows = await lines(ktemaHome);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Clean the filter', detail: 'Dishwasher · Since Sun', open: '/ktema/?open=upkeep%3Au1', swipe: { id: 'upkeep:u1', word: 'Done', marks: true } });
    expect(text(rows)).not.toMatch(/CANARY|2030/);
  });
  it('marks the upkeep done in Ktema on a pull, and the undo takes the mark off', async () => {
    const { ktemaHome } = await import('../../ktema/providers/home');
    put('ktema:upkeep:u1', upkeep('u1', 'Clean the filter', '2026-11-01'));
    expect(await lines(ktemaHome)).toHaveLength(1);
    const undo = ktemaHome.act!({ app: 'ktema', kind: 'upkeep', id: 'u1' }, TODAY);
    expect(await lines(ktemaHome)).toEqual([]);
    undo();
    expect(await lines(ktemaHome)).toHaveLength(1);
  });
  it('follows a deleted upkeep', async () => {
    const { ktemaHome } = await import('../../ktema/providers/home');
    put('ktema:upkeep:u1', upkeep('u1', 'Clean the filter', '2026-11-01'));
    localStorage.removeItem('ktema:upkeep:u1');
    expect(await lines(ktemaHome)).toEqual([]);
  });
});

describe('Soma on Today', () => {
  const recipe = (id: string, title: string, extra: Record<string, unknown> = {}) => ({ id, title, ingredients: ['CANARY-INGREDIENT'], notes: 'CANARY-NOTE', tags: ['CANARY-TAG'], createdAt: day, updatedAt: day, ...extra });
  it('says which meals are planned for today and not cooked, by title, in order', async () => {
    const { somaHome } = await import('../../soma/providers/home');
    records.somaRecipes = [recipe('r2', 'Lentil soup', { planned: [TODAY] }), recipe('r1', 'Bread', { planned: [TODAY] }), recipe('r3', 'Done', { planned: [TODAY], cooked: [TODAY] }), recipe('r4', 'Tomorrow', { planned: ['2026-11-06'] }), recipe('r5', 'Never planned')];
    const rows = await lines(somaHome);
    expect(rows.map((row) => row.title)).toEqual(['Bread', 'Lentil soup']);
    expect(rows[0]).toMatchObject({ detail: 'Planned for today', open: '/soma/?open=recipe%3Ar1', swipe: { id: 'meal:r1', word: 'Cooked', marks: true } });
    expect(text(rows)).not.toMatch(/CANARY/);
  });
  it('a pull marks the meal cooked in Soma, and the undo puts it back', async () => {
    const { somaHome } = await import('../../soma/providers/home');
    records.somaRecipes = [recipe('r1', 'Bread', { planned: [TODAY] })];
    expect(await lines(somaHome)).toHaveLength(1);
    const undo = somaHome.act!({ app: 'soma', kind: 'meal', id: 'r1' }, TODAY);
    expect(typeof undo).toBe('function');
    undo();
  });
});

describe('Ergon on Today', () => {
  const chore = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, room: 'Kitchen', note: 'CANARY-NOTE', steps: [{ id: 's', text: 'CANARY-STEP', done: false }], repeat: { kind: 'days', every: 3 }, start: '2026-11-02', history: [], createdAt: day, ...extra });
  it('says which chores have come round, since when and who has them, never the note or steps', async () => {
    const { ergonHome } = await import('../../ergon/providers/home');
    put('ergon:chore:c1', chore('c1', 'Wipe counters', { who: 'Sam' }));
    put('ergon:chore:c2', chore('c2', 'Later', { start: '2026-11-20' }));
    put('ergon:chore:c3', chore('c3', 'Water the herbs', { start: '2026-11-01', repeat: { kind: 'days', every: 30 } }));
    const rows = await lines(ergonHome);
    expect(rows.map((row) => row.title)).toEqual(['Water the herbs', 'Wipe counters']);
    expect(rows[0].detail).toBe('Since Sun');
    expect(rows[1]).toMatchObject({ title: 'Wipe counters', detail: 'Sam', open: '/ergon/?open=chore%3Ac1', swipe: { id: 'chore:c1', word: 'Done', marks: true } });
    expect(text(rows)).not.toMatch(/CANARY/);
  });
  it('a pull marks the chore done in Ergon and the undo brings it back', async () => {
    const { ergonHome } = await import('../../ergon/providers/home');
    put('ergon:chore:c1', chore('c1', 'Wipe counters'));
    const undo = ergonHome.act!({ app: 'ergon', kind: 'chore', id: 'c1' }, TODAY);
    expect(await lines(ergonHome)).toEqual([]);
    undo();
    expect(await lines(ergonHome)).toHaveLength(1);
  });
  it('moves a chore that comes round on a work day to the next day off, when the person chose that', async () => {
    const { ergonHome } = await import('../../ergon/providers/home');
    put('ergon:settings', { started: true, me: 'Sam', notices: {}, daysOff: true });
    put('ergon:chore:c1', chore('c1', 'Wipe counters', { start: '2026-11-05' }));
    const work = [{ kind: 'COMMITTED', start: new Date('2026-11-05T09:00:00'), end: new Date('2026-11-05T17:00:00'), label: 'Work', patternName: 'Work', patternId: 'p', id: 'o1', date: '2026-11-05' }];
    expect(await lines(ergonHome, { schedule: async () => work as never })).toEqual([]);
    expect(await lines(ergonHome, { schedule: async () => [] })).toHaveLength(1);
  });
  it('follows an edit and a deletion', async () => {
    const { ergonHome } = await import('../../ergon/providers/home');
    put('ergon:chore:c1', chore('c1', 'Wipe counters'));
    put('ergon:chore:c1', chore('c1', 'Wipe the counters'));
    expect((await lines(ergonHome))[0].title).toBe('Wipe the counters');
    localStorage.removeItem('ergon:chore:c1');
    expect(await lines(ergonHome)).toEqual([]);
  });
});

describe('Phyton on Today', () => {
  const plant = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, place: 'CANARY-PLACE', note: 'CANARY-NOTE', every: 7, start: '2026-10-25', log: [], createdAt: day, ...extra });
  it('says which plants have come round to be checked and since when, never the note or place', async () => {
    const { phytonHome } = await import('../../phyton/providers/home');
    put('phyton:plant:p1', plant('p1', 'Fern'));
    put('phyton:plant:p2', plant('p2', 'Basil', { start: '2026-11-05' }));
    put('phyton:plant:p3', plant('p3', 'Later', { start: '2026-12-01' }));
    const rows = await lines(phytonHome);
    expect(rows.map((row) => row.title)).toEqual(['Fern', 'Basil']);
    expect(rows[0]).toMatchObject({ detail: 'Check the soil · Since Oct 25', open: '/phyton/?open=plant%3Ap1', swipe: { id: 'plant:p1', word: 'Watered', marks: true } });
    expect(rows[1].detail).toBe('Check the soil');
    expect(text(rows)).not.toMatch(/CANARY/);
  });
  it('rain the device kept counts only when the person chose it, and nothing is fetched', async () => {
    const { phytonHome } = await import('../../phyton/providers/home');
    const realFetch = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = (() => { fetched += 1; throw new Error('network'); }) as unknown as typeof fetch;
    put('phyton:plant:p1', plant('p1', 'Fern', { outside: true }));
    await lines(phytonHome);
    globalThis.fetch = realFetch;
    expect(fetched).toBe(0);
  });
  it('a pull waters the plant in Phyton and the undo takes it back', async () => {
    const { phytonHome } = await import('../../phyton/providers/home');
    put('phyton:plant:p1', plant('p1', 'Fern'));
    const undo = phytonHome.act!({ app: 'phyton', kind: 'plant', id: 'p1' }, TODAY);
    expect(await lines(phytonHome)).toEqual([]);
    undo();
    expect(await lines(phytonHome)).toHaveLength(1);
  });
});

describe('Therapeia on Today', () => {
  const medicine = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, dose: 'CANARY-DOSE 50 mg', strength: 'CANARY-DOSE-STRENGTH', amount: 'CANARY-DOSE-AMOUNT', note: 'CANARY-MEDNOTE', times: [{ kind: 'clock', at: '20:00' }], days: { kind: 'daily' }, start: '2026-10-01', taken: [], createdAt: day, ...extra });
  const visit = (id: string, at: string, extra: Record<string, unknown> = {}) => ({ id, with: 'Dr Lee', where: 'Clinic', notes: 'CANARY-VISITNOTE', questions: [{ id: 'q', text: 'CANARY-QUESTION' }], at, createdAt: day, ...extra });
  it('says the doses not yet marked, with the time only, and visits today with time and place', async () => {
    const { therapeiaHome } = await import('../../therapeia/providers/home');
    put('therapeia:medicine:m1', medicine('m1', 'Sertraline'));
    put('therapeia:visit:v1', visit('v1', '2026-11-05T15:00'));
    put('therapeia:visit:v2', visit('v2', '2026-11-06T15:00'));
    const rows = await lines(therapeiaHome);
    expect(rows.map((row) => [row.title, row.detail])).toEqual([['Sertraline', '8:00 PM'], ['Dr Lee', '3:00 PM · Clinic']]);
    expect(rows[0].swipe).toEqual({ id: 'dose:m1:2026-11-05#0', word: 'Taken', marks: true });
    expect(rows[1].swipe).toEqual({ id: 'visit:v1', word: 'Done' });
    expect(text(rows)).not.toMatch(/CANARY/);
  });
  it('the amount of a dose reaches no field of any line: not title, detail, open, ref, swipe or icon', async () => {
    const { therapeiaHome } = await import('../../therapeia/providers/home');
    put('therapeia:medicine:m1', medicine('m1', 'Sertraline', { supply: { count: 3, countedAt: '2026-11-01T08:00:00', perDose: 1, lead: 7 } }));
    put('therapeia:medicine:m2', medicine('m2', 'Vitamin D', { dose: 'CANARY-DOSE 2000 IU' }));
    const rows = await lines(therapeiaHome);
    expect(rows.map((row) => row.ref.kind).sort()).toEqual(['dose', 'dose', 'refill']);
    expect(JSON.stringify(rows)).not.toMatch(/CANARY|50 mg|2000|IU|\bmg\b/i);
    for (const row of rows) expect(Object.keys(row).every((key) => ['ref', 'group', 'title', 'detail', 'open', 'icon', 'progress', 'swipe', 'notForMe'].includes(key))).toBe(true);
  });
  it('says a refill coming up, with the day it is due', async () => {
    const { therapeiaHome } = await import('../../therapeia/providers/home');
    put('therapeia:medicine:m1', medicine('m1', 'Sertraline', { supply: { count: 3, countedAt: '2026-11-01T08:00:00', perDose: 1, lead: 7 } }));
    const rows = await lines(therapeiaHome);
    expect(rows.some((row) => row.ref.kind === 'refill' && row.detail === 'Refill due today')).toBe(true);
  });
  it('a pull marks a dose taken in Therapeia, the line goes, and the undo brings it back', async () => {
    const { therapeiaHome } = await import('../../therapeia/providers/home');
    put('therapeia:medicine:m1', medicine('m1', 'Sertraline'));
    const before = await lines(therapeiaHome);
    const undo = therapeiaHome.act!(before[0].ref, TODAY);
    expect((await lines(therapeiaHome)).filter((row) => row.ref.kind === 'dose')).toEqual([]);
    undo();
    expect((await lines(therapeiaHome)).filter((row) => row.ref.kind === 'dose')).toHaveLength(1);
  });
  it('follows a stopped medicine and a deleted visit', async () => {
    const { therapeiaHome } = await import('../../therapeia/providers/home');
    put('therapeia:medicine:m1', medicine('m1', 'Sertraline', { stopped: '2026-11-01' }));
    put('therapeia:visit:v1', visit('v1', '2026-11-05T15:00'));
    expect((await lines(therapeiaHome)).map((row) => row.ref.kind)).toEqual(['visit']);
    localStorage.removeItem('therapeia:visit:v1');
    expect(await lines(therapeiaHome)).toEqual([]);
  });
});

describe('Poreia on Today', () => {
  const trip = (id: string, name: string, start: string, end: string, extra: Record<string, unknown> = {}) => ({ id, name, place: { label: 'Lisbon' }, start, end, travelers: 1, stage: 'booked', notes: 'CANARY-NOTE', createdAt: day, updatedAt: day, ...extra });
  it('says a trip starting within three days, with its next thing and what is left to pack, never codes or notes', async () => {
    const { poreiaHome } = await import('../../poreia/providers/home');
    put('poreia:trip:tr1', trip('tr1', 'Lisbon', '2026-11-07', '2026-11-12'));
    put('poreia:plan:pn1', { id: 'pn1', tripId: 'tr1', date: '2026-11-07', time: '09:00', title: 'Tram 28', note: 'CANARY-PLAN', createdAt: day, updatedAt: day });
    put('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'stay', title: 'Hotel', confirmation: 'CANARY-CODE', createdAt: day, updatedAt: day });
    put('poreia:pack:pk1', { id: 'pk1', tripId: 'tr1', name: 'Charger', packed: false, createdAt: day });
    const rows = await lines(poreiaHome);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Lisbon in 2 days', detail: 'Tram 28 · 1 to pack', open: '/poreia/?open=trip%3Atr1', icon: 'suitcase', notForMe: 'trips', swipe: { id: 'trip:tr1' } });
    expect(text(rows)).not.toMatch(/CANARY/);
  });
  it('says a trip under way by where it stands, and shows nothing for a trip further off', async () => {
    const { poreiaHome } = await import('../../poreia/providers/home');
    put('poreia:trip:tr1', trip('tr1', 'Lisbon', '2026-11-03', '2026-11-08'));
    expect((await lines(poreiaHome))[0].title).toMatch(/^Lisbon · /);
    localStorage.clear();
    put('poreia:trip:tr2', trip('tr2', 'Oslo', '2026-12-20', '2026-12-25'));
    expect(await lines(poreiaHome)).toEqual([]);
  });
  it('the next thing follows the clock', async () => {
    const { poreiaHome } = await import('../../poreia/providers/home');
    put('poreia:trip:tr1', trip('tr1', 'Lisbon', '2026-11-03', '2026-11-08'));
    put('poreia:plan:a', { id: 'a', tripId: 'tr1', date: TODAY, time: '09:00', title: 'Breakfast', createdAt: day, updatedAt: day });
    put('poreia:plan:b', { id: 'b', tripId: 'tr1', date: TODAY, time: '19:00', title: 'Dinner', createdAt: day, updatedAt: day });
    expect((await lines(poreiaHome, { now: new Date(`${TODAY}T08:00:00`) }))[0].detail).toContain('Breakfast');
    expect((await lines(poreiaHome, { now: new Date(`${TODAY}T12:00:00`) }))[0].detail).toContain('Dinner');
    expect(poreiaHome.maxAgeMs).toBe(60_000);
  });
});

describe('Meletē on Today', () => {
  const subject = (id: string, name: string, dates: unknown[] = []) => ({ id, name, dates, materials: [{ id: 'm', title: 'CANARY-MATERIAL' }], ifThen: 'CANARY-IFTHEN', createdAt: day });
  const session = (id: string, start: string, extra: Record<string, unknown> = {}) => ({ id, subjectId: 's1', kind: 'read', start, minutes: 30, ...extra });
  it('says the next session set today and the nearest date within a week, never materials or if-then lines', async () => {
    const { meleteHome } = await import('../../melete/providers/home');
    put('melete:subject:s1', subject('s1', 'Biology', [{ id: 'd1', title: 'Midterm', date: '2026-11-08', kind: 'exam' }]));
    put('melete:session:ss1', session('ss1', '2026-11-05T15:00:00'));
    const rows = await lines(meleteHome);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ group: 'practice', open: '/melete/' });
    expect(rows[0].title).toBeUndefined();
    expect(rows[0].detail).toMatch(/^Biology · 3:00 PM · Biology: Midterm in 3 days$/);
    expect(text(rows)).not.toMatch(/CANARY/);
  });
  it('says minutes studied once a session is done, "No study sessions today", and "Add a subject" with none', async () => {
    const { meleteHome } = await import('../../melete/providers/home');
    expect((await lines(meleteHome))[0].detail).toBe('Add a subject');
    put('melete:subject:s1', subject('s1', 'Biology'));
    expect((await lines(meleteHome))[0].detail).toBe('No study sessions today');
    put('melete:session:ss1', session('ss1', '2026-11-05T09:00:00', { doneAt: '2026-11-05T09:30:00' }));
    expect((await lines(meleteHome))[0].detail).toBe('30 min studied today');
  });
  it('counts the person’s day, which a night shift carries past midnight', async () => {
    const { meleteHome } = await import('../../melete/providers/home');
    put('melete:subject:s1', subject('s1', 'Biology'));
    put('melete:session:ss1', session('ss1', '2026-11-06T01:00:00', { doneAt: '2026-11-06T01:30:00' }));
    expect((await lines(meleteHome))[0].detail).toBe('No study sessions today');
    const carried = { start: new Date('2026-11-05T04:00:00'), end: new Date('2026-11-06T04:00:00') };
    expect((await lines(meleteHome, { day: carried }))[0].detail).toBe('30 min studied today');
  });
});

describe('Diaita on Today', () => {
  it('says whether sleep is set up and the hours slept last night, never how it was or the notes', async () => {
    const { diaitaHome } = await import('../../diaita/providers/home');
    expect((await lines(diaitaHome))[0].detail).toBe('Set up sleep tracking');
    put('diaita:settings', { started: true });
    expect((await lines(diaitaHome))[0].detail).toBe('Log last night’s sleep');
    put('diaita:sleep:2026-11-05', { id: '2026-11-05', date: '2026-11-05', bed: '23:00', up: '06:30', how: 'poorly', note: 'CANARY-NOTE', snoring: true });
    const rows = await lines(diaitaHome);
    expect(rows[0]).toMatchObject({ group: 'practice', detail: '7 h 30 min slept', open: '/diaita/' });
    expect(text(rows)).not.toMatch(/CANARY|poorly|snoring/);
  });
});

describe('Theoria on Today', () => {
  const focus = (id: string, itemId: string, at: string, minutes: number) => ({ id, itemId, kind: 'FOCUSED', timestamp: at, metadata: { app: 'praxis', minutes } });
  async function homeWith(blocks: unknown[], events: unknown[]) {
    vi.resetModules();
    vi.doMock('../../app/services', () => ({ lifeService: { listForApp: async () => blocks, historyForAll: async () => events, subscribe: () => () => undefined } }));
    return (await import('../../theoria/providers/home')).theoriaHome;
  }
  it('says the minutes read today from reading blocks, never titles', async () => {
    const home = await homeWith(
      [{ id: 'b1', title: 'Read: CANARY-BOOK' }, { id: 'b2', title: 'Write the essay' }],
      [focus('e1', 'b1', '2026-11-05T08:00:00', 25), focus('e2', 'b1', '2026-11-05T09:00:00', 15), focus('e3', 'b2', '2026-11-05T10:00:00', 40), focus('e4', 'b1', '2026-11-04T09:00:00', 99)],
    );
    const rows = await lines(home);
    expect(rows[0]).toMatchObject({ group: 'practice', detail: '40 min reading today', open: '/theoria/' });
    expect(text(rows)).not.toMatch(/CANARY|99/);
  });
  it('says nothing was read when nothing was, and counts the person’s own day', async () => {
    const home = await homeWith([{ id: 'b1', title: 'Read: A book' }], [focus('e1', 'b1', '2026-11-06T01:00:00', 20)]);
    expect((await lines(home))[0].detail).toBe('No reading logged today');
    expect((await lines(home, { day: { start: new Date('2026-11-05T04:00:00'), end: new Date('2026-11-06T04:00:00') } }))[0].detail).toBe('20 min reading today');
    vi.doUnmock('../../app/services');
  });
});

describe('Hydros on Today', () => {
  const drink = (id: string, at: string, extra: Record<string, unknown> = {}) => ({ id, kind: 'water', amountOz: 16, caffeineMg: 31337, sugarG: 4242, loggedAt: at, createdAt: at, ...extra });
  const settings = (extra: Record<string, unknown> = {}) => { localStorage.setItem('hydros:settings-format', '3'); put('hydros:settings', { unit: 'oz', ...extra }); };
  it('says the amount drunk today, with no daily amount until one is chosen, never drinks, times or caffeine', async () => {
    const { hydrosHome } = await import('../../hydros/providers/home');
    settings();
    records.hydrosDrinks = [drink('d1', '2026-11-05T09:43:00'), drink('d2', '2026-11-04T09:00:00')];
    const rows = await lines(hydrosHome);
    expect(rows[0]).toMatchObject({ group: 'practice', detail: '16 oz logged', open: '/hydros/' });
    expect(rows[0].progress).toBeUndefined();
    expect(text(rows)).not.toMatch(/31337|4242|09:43/);
  });
  it('says the amount against the daily amount the person chose, with a bar', async () => {
    const { hydrosHome } = await import('../../hydros/providers/home');
    settings({ goalChosen: true, goalOz: 64 });
    records.hydrosDrinks = [drink('d1', '2026-11-05T09:00:00')];
    const rows = await lines(hydrosHome);
    expect(rows[0].detail).toBe('16 of 64 oz');
    expect(rows[0].progress).toEqual({ value: 0.25, label: '16 of 64 oz' });
  });
  it('says no drinks yet, and counts a night’s drinks on the day the schedule gives them', async () => {
    const { hydrosHome } = await import('../../hydros/providers/home');
    settings();
    records.hydrosDrinks = [];
    expect((await lines(hydrosHome))[0].detail).toBe('No drinks logged yet');
    records.hydrosDrinks = [drink('d1', '2026-11-06T01:30:00')];
    expect((await lines(hydrosHome))[0].detail).toBe('No drinks logged yet');
    const night = [{ kind: 'COMMITTED', start: new Date('2026-11-05T21:00:00'), end: new Date('2026-11-06T05:00:00'), date: '2026-11-05', label: 'Night', patternName: 'Night', patternId: 'p', id: 'o' }];
    expect((await lines(hydrosHome, { schedule: async () => night as never }))[0].detail).toBe('16 oz logged');
  });
});

describe('Askesis on Today', () => {
  type Mocked = { run?: { title: string }; completed?: { id: string }; plan?: boolean };
  async function homeWith({ run, completed, plan }: Mocked, refreshed: string[] = []) {
    vi.resetModules();
    vi.doMock('../../app/askesis/runs', () => ({
      readRuns: async () => ({ plan: plan ? {} : undefined, workouts: completed ? [{ id: completed.id, date: '2026-11-05' }] : [], unit: 'km' }),
      todaysRun: () => run,
      runLength: () => '30 min',
      runTitle: () => 'Run · 5.0 km',
    }));
    vi.doMock('../../app/family/trainingWeek', () => ({ refreshTrainingWeek: () => refreshed.push('refreshed'), watchTrainingWeek: () => () => undefined }));
    return (await import('../../askesis/providers/home')).askesisHome;
  }
  it('says today’s session with its length', async () => {
    const home = await homeWith({ run: { title: 'Easy run' }, plan: true });
    const rows = await lines(home);
    expect(rows[0]).toMatchObject({ group: 'practice', detail: 'Easy run · 30 min', open: '/askesis/' });
  });
  it('says the run done today, no run scheduled, or a plan to start', async () => {
    expect((await lines(await homeWith({ completed: { id: 'e1' }, plan: true })))[0].detail).toBe('Run · 5.0 km · Done today');
    expect((await lines(await homeWith({ plan: true })))[0].detail).toBe('No run scheduled today');
    expect((await lines(await homeWith({})))[0].detail).toBe('Start a running plan');
  });
  it('asks for the worked-out week to be current when Today starts (warm), and no other time', async () => {
    const refreshed: string[] = [];
    const home = await homeWith({}, refreshed);
    await lines(home);
    expect(refreshed).toEqual([]);
    home.warm?.(ctx());
    expect(refreshed).toEqual(['refreshed']);
    vi.doUnmock('../../app/askesis/runs');
    vi.doUnmock('../../app/family/trainingWeek');
  });
});

describe('Dynamis on Today', () => {
  const setup = (days: number[]) => put('dynamis:setup', { aim: 'strength', place: 'gym', isNew: false, days, sets: 3, setsSince: '2026-10-01', unit: 'kg', startedOn: '2026-10-01', steps: {} });
  const workout = (id: string, date: string, session: string) => ({ id, date, session, exercises: [{ exercise: 'squat', name: 'CANARY-EXERCISE', sets: [{ weight: 98765, reps: 5 }] }], note: 'CANARY-NOTE', createdAt: day });
  it('says to set up strength training until the person has', async () => {
    const { dynamisHome } = await import('../../dynamis/providers/home');
    expect((await lines(dynamisHome))[0]).toMatchObject({ group: 'practice', detail: 'Set up strength training', open: '/dynamis/' });
  });
  it('says today’s session on a training day, a rest day otherwise, and the session done today, never weights or notes', async () => {
    const { dynamisHome } = await import('../../dynamis/providers/home');
    setup([1, 3, 4]);
    expect((await lines(dynamisHome))[0].detail).toMatch(/^Strength session · /);
    setup([1, 3, 5]);
    expect((await lines(dynamisHome))[0].detail).toBe('Rest day');
    put('dynamis:workout:w1', workout('w1', TODAY, 'A'));
    const rows = await lines(dynamisHome);
    expect(rows[0].detail).toMatch(/ · Done today$/);
    expect(text(rows)).not.toMatch(/CANARY|98765/);
  });
  it('asks for the worked-out week to be current when Today starts (warm)', async () => {
    const { dynamisHome } = await import('../../dynamis/providers/home');
    expect(typeof dynamisHome.warm).toBe('function');
  });
});
