// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { calendarLines, homeRows, searchProjections, type HostContext } from '../../core/providers';
import { search, type Searchable } from '../../core/search/search';
import { withCache } from '../../app/providers/cache';

/*
 * How long providers and a search take on a large library. The sizes are several times what one person is likely to
 * hold (thousands of recipes, drinks and chores), and the limits are generous so the test says "no cliff", not "this
 * machine". The measured times are printed so a change that makes them worse shows in the run.
 */
const TODAY = '2026-11-05';
const iso = '2026-11-01T09:00:00.000Z';
const N = 3000;
const many = <T,>(make: (index: number) => T) => Array.from({ length: N }, (_, index) => make(index));

const records: Record<string, unknown[]> = {
  somaRecipes: many((i) => ({ id: `r${i}`, title: `Recipe ${i} lentil`, ingredients: ['1 cup lentils', 'carrot', `item ${i}`], notes: `note ${i}`, tags: ['soup'], createdAt: iso })),
  theoriaBooks: many((i) => ({ id: `b${i}`, title: `Book ${i}`, author: 'Author', highlights: [{ id: 'h', text: `highlight ${i}` }], notes: [], updatedAt: iso })),
  askesisWorkouts: many((i) => ({ id: `e${i}`, activity: 'run', date: '2026-10-20', notes: `felt ${i}`, createdAt: iso })),
  oikonomiaBills: many((i) => ({ id: `bill${i}`, name: `Bill ${i}`, amountCents: 1000, currency: 'USD', dueDate: '2026-11-10', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: iso, updatedAt: iso })),
  hydrosDrinks: many((i) => ({ id: `d${i}`, kind: 'tea', label: `Tea ${i % 40}`, amountOz: 12, loggedAt: `2026-10-${String(10 + (i % 20)).padStart(2, '0')}T08:00:00.000Z`, createdAt: iso })),
  'local:philia:person:': many((i) => ({ id: `p${i}`, name: `Person ${i}`, notes: [], gifts: [{ id: 'g', text: `gift ${i}` }], times: [], createdAt: iso })),
  'local:ktema:thing:': many((i) => ({ id: `t${i}`, name: `Thing ${i}`, createdAt: iso })),
  'local:ktema:upkeep:': many((i) => ({ id: `u${i}`, thingId: `t${i}`, name: `Upkeep ${i}`, every: { count: 3, unit: 'months' }, start: '2026-11-01', history: [], createdAt: iso })),
  'local:poreia:trip:': many((i) => ({ id: `tr${i}`, name: `Trip ${i}`, place: { label: `Place ${i}` }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', createdAt: iso, updatedAt: iso })),
  'local:ergon:chore:': many((i) => ({ id: `c${i}`, name: `Chore ${i}`, room: 'Kitchen', repeat: { kind: 'days', every: 1 }, start: '2026-11-04', history: [], createdAt: iso })),
  'local:phyton:plant:': many((i) => ({ id: `pl${i}`, name: `Plant ${i}`, place: 'Hall', every: 7, start: '2026-10-25', log: [], createdAt: iso })),
  'local:poreia:booking:': many((i) => ({ id: `bk${i}`, tripId: `tr${i}`, kind: 'stay', title: `Booking ${i}`, createdAt: iso, updatedAt: iso })),
  'local:poreia:plan:': many((i) => ({ id: `pl${i}`, tripId: `tr${i}`, date: '2026-12-01', title: `Plan ${i}`, createdAt: iso, updatedAt: iso })),
  'local:dynamis:workout:': many((i) => ({ id: `w${i}`, date: '2026-10-30', session: 'A', exercises: [], note: `strong ${i}`, createdAt: iso })),
};
const ctx: HostContext = {
  today: TODAY,
  now: new Date(`${TODAY}T12:00:00`),
  records: async <T,>(source: string) => (records[source] ?? []) as T[],
  setting: () => null,
  isUsable: () => true,
  enabled: () => true,
};

describe('provider and search time on a large library', () => {
  it('every provider derives thousands of rows quickly, and a search over all of them answers at once', async () => {
    const modules = await Promise.all([
      import('../../soma/providers'), import('../../theoria/providers'), import('../../askesis/providers'), import('../../oikonomia/providers'),
      import('../../hydros/providers'), import('../../philia/providers'), import('../../ktema/providers'), import('../../poreia/providers'), import('../../dynamis/providers'),
    ]);
    const providers = modules.flatMap((module) => module.providers).filter((provider) => provider.capability === 'search') as never[];
    const started = performance.now();
    const out = await searchProjections(providers, APPS, ctx);
    const derive = performance.now() - started;
    const table = out.timings.map((each) => `${each.app} ${each.ms} ms (${each.rows} rows)`).join(', ');
    console.log(`providers: ${Math.round(derive)} ms for ${out.results.length} rows; ${table}`);
    expect(out.rejected).toEqual([]);
    expect(out.results.length).toBeGreaterThan(10 * N);
    for (const each of out.timings) expect(each.ms, each.app).toBeLessThan(1500);
    expect(derive).toBeLessThan(5000);

    const things: Searchable[] = out.results.map((row) => ({ id: row.ref.id, kind: 'app', title: row.title, fields: row.fields, at: row.at, href: row.open }));
    const times: number[] = [];
    for (const query of ['lentil', 'person 1', 'strong 2999', 'zzz nothing']) {
      const at = performance.now();
      search(query, things);
      times.push(Math.round((performance.now() - at) * 10) / 10);
    }
    console.log(`search over ${things.length} rows: ${times.join(', ')} ms for four queries (first builds the word index)`);
    for (const time of times) expect(time).toBeLessThan(1500);
  }, 60_000);

  it('a cached provider costs nothing the second time, and one change rebuilds only its own app', async () => {
    const { somaSearch } = await import('../../soma/providers/search');
    const { philiaSearch } = await import('../../philia/providers/search');
    const listeners = new Set<(collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void>();
    const subscribe = (listener: (collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void) => { listeners.add(listener); return () => listeners.delete(listener); };
    let derived: string[] = [];
    const counted = (provider: typeof somaSearch) => withCache({ ...provider, read: async (c) => { derived.push(provider.app); return provider.read(c); } }, subscribe);
    const soma = counted(somaSearch);
    const philia = counted(philiaSearch as never);
    await searchProjections([soma, philia as never], APPS, ctx);
    expect(derived.sort()).toEqual(['philia', 'soma']);
    derived = [];
    const again = performance.now();
    await searchProjections([soma, philia as never], APPS, ctx);
    const reused = performance.now() - again;
    expect(derived).toEqual([]);
    console.log(`second run, both cached: ${Math.round(reused * 10) / 10} ms (policy checks only)`);
    listeners.forEach((listener) => listener(['preferences'], new Map([['preferences', ['philia:person:p1']]])));
    await searchProjections([soma, philia as never], APPS, ctx);
    expect(derived).toEqual(['philia']);
  }, 60_000);
});

describe('Home time on a large library', () => {
  it('every home provider derives its lines from thousands of records quickly', async () => {
    const modules = await Promise.all([
      import('../../oikonomia/providers'), import('../../philia/providers'), import('../../ktema/providers'), import('../../poreia/providers'),
      import('../../ergon/providers'), import('../../phyton/providers'), import('../../therapeia/providers'), import('../../melete/providers'),
    ]);
    const providers = modules.flatMap((module) => module.providers).filter((provider) => provider.capability === 'home') as never[];
    expect(providers.length).toBeGreaterThan(4);
    const homeCtx = { ...ctx, day: { today: TODAY, start: new Date(`${TODAY}T00:00:00`), end: new Date(`${TODAY}T23:59:59`) } } as unknown as HostContext;
    const started = performance.now();
    const out = await homeRows(providers, APPS, homeCtx);
    const total = performance.now() - started;
    console.log(`home: ${Math.round(total)} ms for ${out.rows.length} lines; ${out.timings.map((each) => `${each.app} ${each.ms} ms`).join(', ')}`);
    expect(out.rejected).toEqual([]);
    for (const each of out.timings) expect(each.ms, each.app).toBeLessThan(1500);
    expect(total).toBeLessThan(5000);
  }, 60_000);
});

describe('Calendar time on a large library', () => {
  const dateIn = (i: number, month = '11') => `2026-${month}-${String(1 + (i % 28)).padStart(2, '0')}`;
  const calRecords: Record<string, unknown[]> = {
    'local:philia:person:': many((i) => ({ id: `p${i}`, name: `Person ${i}`, birthday: `19${60 + (i % 40)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, dates: [{ id: 'a', label: 'Anniversary', date: `2010-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}` }, { id: 'e', label: 'Dinner', date: dateIn(i), once: true, time: '19:00' }], notes: [], gifts: [], times: [], createdAt: iso })),
    oikonomiaBills: many((i) => ({ id: `bill${i}`, name: `Bill ${i}`, amountCents: 1000, currency: 'USD', dueDate: dateIn(i, '10'), frequency: ['weekly', 'monthly', 'quarterly', 'yearly'][i % 4], autopay: false, reminderDays: 3, payments: [], createdAt: iso, updatedAt: iso })),
    'local:ktema:thing:': many((i) => ({ id: `t${i}`, name: `Thing ${i}`, category: 'Appliance', warrantyUntil: dateIn(i), createdAt: iso })),
    'local:ktema:upkeep:': many((i) => ({ id: `u${i}`, thingId: `t${i}`, name: `Upkeep ${i}`, every: { count: 3, unit: 'months' }, start: dateIn(i), history: [], createdAt: iso })),
    'local:melete:subject:': many((i) => ({ id: `s${i}`, name: `Subject ${i}`, dates: [{ id: 'd', title: 'Exam', date: dateIn(i), kind: 'exam' }], materials: [], createdAt: iso })),
    'local:melete:session:': many((i) => ({ id: `ss${i}`, subjectId: `s${i}`, kind: 'read', start: `${dateIn(i)}T${String(8 + (i % 10)).padStart(2, '0')}:00:00`, minutes: 30 })),
    'local:therapeia:visit:': many((i) => ({ id: `v${i}`, with: `Dr ${i}`, at: `${dateIn(i)}T${String(8 + (i % 10)).padStart(2, '0')}:30`, questions: [], createdAt: iso })),
    'local:poreia:trip:': many((i) => ({ id: `tr${i}`, name: `Trip ${i}`, place: { label: `Place ${i}` }, start: dateIn(i), end: dateIn(i + 3), travelers: 1, stage: 'booked', createdAt: iso, updatedAt: iso })),
    'local:poreia:booking:': many((i) => ({ id: `bk${i}`, tripId: `tr${i}`, kind: 'flight', title: `Flight ${i}`, startDate: dateIn(i), startTime: '08:15', endTime: '10:30', createdAt: iso, updatedAt: iso })),
    'local:poreia:plan:': many((i) => ({ id: `pl${i}`, tripId: `tr${i}`, date: dateIn(i), time: '09:00', title: `Plan ${i}`, createdAt: iso, updatedAt: iso })),
  };
  const calCtx = (from: string, until: string): HostContext => ({
    today: TODAY,
    now: new Date(`${TODAY}T12:00:00`),
    range: { from: new Date(`${from}T00:00:00`), until: new Date(`${until}T00:00:00`) },
    records: async <T,>(source: string) => (calRecords[source] ?? []) as T[],
    setting: () => null,
    isUsable: () => true,
    enabled: () => true,
  } as HostContext);

  it('every calendar provider derives a month and a year from thousands of records quickly, and one pass serves the whole range', async () => {
    const modules = await Promise.all([
      import('../../philia/providers/calendar'), import('../../oikonomia/providers/calendar'), import('../../ktema/providers/calendar'),
      import('../../melete/providers/calendar'), import('../../therapeia/providers/calendar'), import('../../poreia/providers/calendar'),
    ]);
    const providers = modules.flatMap((module) => Object.values(module)) as never[];
    for (const [from, until] of [['2026-11-01', '2026-12-01'], ['2026-01-01', '2027-01-01']]) {
      const started = performance.now();
      const out = await calendarLines(providers, APPS, calCtx(from, until));
      const total = performance.now() - started;
      console.log(`calendar ${from}..${until}: ${Math.round(total)} ms for ${out.lines.length} lines; ${out.timings.map((each) => `${each.app} ${each.ms} ms (${each.rows})`).join(', ')}`);
      expect(out.rejected).toEqual([]);
      expect(out.lines.length).toBeGreaterThan(N);
      for (const each of out.timings) expect(each.ms, each.app).toBeLessThan(2500);
      expect(total).toBeLessThan(8000);
    }
  }, 60_000);

  it('a short range costs no more than a long one and returns only what falls inside it', async () => {
    const providers = (await Promise.all([import('../../philia/providers/calendar'), import('../../oikonomia/providers/calendar')])).flatMap((module) => Object.values(module)) as never[];
    const week = await calendarLines(providers, APPS, calCtx('2026-11-05', '2026-11-12'));
    expect(week.rejected).toEqual([]);
    for (const line of week.lines) expect(line.day >= '2026-11-05' && line.day < '2026-11-12', line.title).toBe(true);
  }, 60_000);
});
