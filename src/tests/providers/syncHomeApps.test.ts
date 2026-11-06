// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { APPS } from '../../core/apps';
import { homeRows, type HostContext, type Provider } from '../../core/providers';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { LocalSyncStore, OutgoingRecord, RemoteRecord, RemoteStore, SyncCollection } from '../../data/sync/types';

/*
 * All fourteen home providers across two installs and a stand-in server, one parameterized table. For each app: a
 * record made on one install appears in the other's lines, an edit follows, a deletion returns the lines to what they
 * were, an install with no connection still draws from its own copy, a field the app excludes (a canary in it) never
 * reaches a line or the server in plain text, and an app set aside is not asked. Askesis and Theoria read the device's
 * database through a seam the other apps do not use; the test points that seam at the install's synced collections.
 */
const TODAY = '2026-11-05'; // a Thursday
const day = '2026-11-01T09:00:00.000Z';

function fakeServer() {
  const rows = new Map<string, RemoteRecord>();
  let seq = 0;
  const remote: RemoteStore = {
    async pull(afterSeq, limit) { return [...rows.values()].filter((row) => row.seq > afterSeq).sort((a, b) => a.seq - b.seq).slice(0, limit); },
    async push(records: OutgoingRecord[]) { for (const record of records) rows.set(`${record.collection}:${record.id}`, { ...record, seq: ++seq }); },
  };
  return { remote, rows };
}
let key: CryptoKey;
beforeAll(async () => { key = (await createKeys('quiet river morning')).dataKey; }, 30_000);
afterAll(() => vi.doUnmock('../../app/services'));

type Rec = { collection?: SyncCollection; key?: string; value: Record<string, unknown> & { id: string } };
type Spec = {
  app: string;
  /** Settings the install holds on its own (not synced records), put in browser storage first. */
  base?: Record<string, unknown>;
  create: Rec[];
  edit: Rec[];
  /** The provider, reading this install's copy. */
  view: (install: Install) => Promise<Provider<'home'>>;
};
type Install = ReturnType<typeof install>;

function install(remote: RemoteStore) {
  const local: LocalSyncStore = createMemoryLocalSyncStore();
  const engine = createSyncEngine({ local, state: createMemorySyncStateStore(), remote, key });
  const ctx = (enabled: (app: string) => boolean = () => true): HostContext => ({
    today: TODAY,
    now: new Date(`${TODAY}T12:00:00`),
    day: { today: TODAY, start: new Date(`${TODAY}T00:00:00`), end: new Date('2026-11-06T00:00:00') },
    records: async <T,>(source: string) => {
      if (!source.startsWith('local:')) return (await local.list(source as SyncCollection)) as unknown as T[];
      const prefix = source.slice(6);
      return (await local.list('preferences')).filter((record) => record.id.startsWith(prefix)).map((record) => JSON.parse(String(record.value)) as T);
    },
    setting: (name: string) => localStorage.getItem(name),
    schedule: async () => [],
    daySettings: () => ({ startHour: 0, followShifts: true }),
    isUsable: () => true,
    enabled,
  } as HostContext);
  /** What the apps read from browser storage: this install's own settings, then its synced settings records. */
  const applyToStorage = async (base: Record<string, unknown> = {}) => {
    localStorage.clear();
    for (const [name, value] of Object.entries(base)) localStorage.setItem(name, JSON.stringify(value));
    for (const record of await local.list('preferences')) localStorage.setItem(record.id, String(record.value));
  };
  return { local, engine, ctx, applyToStorage };
}
const putRec = (a: Install, rec: Rec) => (rec.collection ? a.local.put(rec.collection, rec.value) : a.local.put('preferences', { id: rec.key!, value: JSON.stringify(rec.value) }));
const removeRec = (a: Install, rec: Rec) => (rec.collection ? a.local.remove(rec.collection, rec.value.id) : a.local.remove('preferences', rec.key!));

const pref = (key: string, value: Record<string, unknown> & { id: string }): Rec => ({ key, value });
const home = (load: () => Promise<Record<string, Provider<'home'>>>, name: string) => async () => (await load())[name];

const specs: Spec[] = [
  { app: 'philia', create: [pref('philia:person:p1', { id: 'p1', name: 'Mara', birthday: '11-08', phone: 'CANARY-PHONE', notes: [{ id: 'n', text: 'CANARY-NOTE' }], gifts: [], times: [], createdAt: day })], edit: [pref('philia:person:p1', { id: 'p1', name: 'Mara K', birthday: '11-08', phone: 'CANARY-PHONE', notes: [], gifts: [], times: [], createdAt: day })], view: home(() => import('../../philia/providers/home'), 'philiaHome') },
  { app: 'oikonomia', create: [{ collection: 'oikonomiaBills', value: { id: 'b1', name: 'Internet', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-07', frequency: 'monthly', category: 'CANARY-AREA', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE', payments: [], createdAt: day, updatedAt: day } }], edit: [{ collection: 'oikonomiaBills', value: { id: 'b1', name: 'Fiber', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-07', frequency: 'monthly', category: 'CANARY-AREA', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE', payments: [], createdAt: day, updatedAt: day } }], view: home(() => import('../../oikonomia/providers/home'), 'oikonomiaHome') },
  { app: 'ktema', create: [pref('ktema:thing:t1', { id: 't1', name: 'Dishwasher', serial: 'CANARY-SERIAL', createdAt: day }), pref('ktema:upkeep:u1', { id: 'u1', thingId: 't1', name: 'Clean the filter', note: 'CANARY-NOTE', every: { count: 3, unit: 'months' }, start: '2026-11-01', history: [], createdAt: day })], edit: [pref('ktema:upkeep:u1', { id: 'u1', thingId: 't1', name: 'Clean the coil', note: 'CANARY-NOTE', every: { count: 3, unit: 'months' }, start: '2026-11-01', history: [], createdAt: day })], view: home(() => import('../../ktema/providers/home'), 'ktemaHome') },
  { app: 'soma', create: [{ collection: 'somaRecipes', value: { id: 'r1', title: 'Lentil soup', ingredients: ['CANARY-INGREDIENT'], notes: 'CANARY-NOTE', tags: [], planned: [TODAY], createdAt: day, updatedAt: day } }], edit: [{ collection: 'somaRecipes', value: { id: 'r1', title: 'Barley soup', ingredients: ['CANARY-INGREDIENT'], notes: 'CANARY-NOTE', tags: [], planned: [TODAY], createdAt: day, updatedAt: day } }], view: home(() => import('../../soma/providers/home'), 'somaHome') },
  { app: 'ergon', create: [pref('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'CANARY-NOTE', repeat: { kind: 'days', every: 1 }, start: '2026-11-04', history: [], createdAt: day })], edit: [pref('ergon:chore:c1', { id: 'c1', name: 'Wipe the counters', room: 'Kitchen', note: 'CANARY-NOTE', repeat: { kind: 'days', every: 1 }, start: '2026-11-04', history: [], createdAt: day })], view: home(() => import('../../ergon/providers/home'), 'ergonHome') },
  { app: 'phyton', create: [pref('phyton:plant:p1', { id: 'p1', name: 'Fern', place: 'CANARY-PLACE', note: 'CANARY-NOTE', every: 7, start: '2026-10-25', log: [], createdAt: day })], edit: [pref('phyton:plant:p1', { id: 'p1', name: 'Fig', place: 'CANARY-PLACE', note: 'CANARY-NOTE', every: 7, start: '2026-10-25', log: [], createdAt: day })], view: home(() => import('../../phyton/providers/home'), 'phytonHome') },
  { app: 'therapeia', create: [pref('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: 'CANARY-DOSE 50 mg', note: 'CANARY-NOTE', times: [{ kind: 'clock', at: '20:00' }], days: { kind: 'daily' }, start: '2026-10-01', taken: [], createdAt: day })], edit: [pref('therapeia:medicine:m1', { id: 'm1', name: 'Vitamin D', dose: 'CANARY-DOSE 2000 IU', note: 'CANARY-NOTE', times: [{ kind: 'clock', at: '20:00' }], days: { kind: 'daily' }, start: '2026-10-01', taken: [], createdAt: day })], view: home(() => import('../../therapeia/providers/home'), 'therapeiaHome') },
  { app: 'poreia', create: [pref('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', notes: 'CANARY-NOTE', createdAt: day, updatedAt: day }), pref('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'stay', title: 'Hotel', confirmation: 'CANARY-CODE', createdAt: day, updatedAt: day })], edit: [pref('poreia:trip:tr1', { id: 'tr1', name: 'Oporto', place: { label: 'Oporto' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', notes: 'CANARY-NOTE', createdAt: day, updatedAt: day })], view: home(() => import('../../poreia/providers/home'), 'poreiaHome') },
  { app: 'melete', create: [pref('melete:subject:s1', { id: 's1', name: 'Biology', dates: [], materials: [{ id: 'm', title: 'CANARY-MATERIAL' }], ifThen: 'CANARY-IFTHEN', createdAt: day }), pref('melete:session:ss1', { id: 'ss1', subjectId: 's1', kind: 'read', start: '2026-11-05T15:00:00', minutes: 30 })], edit: [pref('melete:subject:s1', { id: 's1', name: 'Chemistry', dates: [], materials: [{ id: 'm', title: 'CANARY-MATERIAL' }], ifThen: 'CANARY-IFTHEN', createdAt: day })], view: home(() => import('../../melete/providers/home'), 'meleteHome') },
  { app: 'diaita', base: { 'diaita:settings': { started: true } }, create: [pref('diaita:sleep:2026-11-05', { id: '2026-11-05', date: '2026-11-05', bed: '23:00', up: '06:30', how: 'poorly', note: 'CANARY-NOTE', snoring: true })], edit: [pref('diaita:sleep:2026-11-05', { id: '2026-11-05', date: '2026-11-05', bed: '23:00', up: '07:30', how: 'poorly', note: 'CANARY-NOTE', snoring: true })], view: home(() => import('../../diaita/providers/home'), 'diaitaHome') },
  { app: 'hydros', base: { 'hydros:settings-format': '3', 'hydros:settings': { unit: 'oz' } }, create: [{ collection: 'hydrosDrinks', value: { id: 'd1', kind: 'water', amountOz: 16, caffeineMg: 31337, sugarG: 4242, loggedAt: '2026-11-05T09:43:00', createdAt: day } }], edit: [{ collection: 'hydrosDrinks', value: { id: 'd1', kind: 'water', amountOz: 32, caffeineMg: 31337, sugarG: 4242, loggedAt: '2026-11-05T09:43:00', createdAt: day } }], view: home(() => import('../../hydros/providers/home'), 'hydrosHome') },
  { app: 'dynamis', base: { 'dynamis:setup': { aim: 'strength', place: 'gym', isNew: false, days: [1, 3, 4], sets: 3, setsSince: '2026-10-01', unit: 'kg', startedOn: '2026-10-01', steps: {} } }, create: [pref('dynamis:workout:w1', { id: 'w1', date: TODAY, session: 'A', exercises: [{ exercise: 'squat', name: 'CANARY-EXERCISE', sets: [{ weight: 98765, reps: 5 }] }], note: 'CANARY-NOTE', createdAt: day })], edit: [pref('dynamis:workout:w1', { id: 'w1', date: TODAY, session: 'B', exercises: [{ exercise: 'squat', name: 'CANARY-EXERCISE', sets: [{ weight: 98765, reps: 5 }] }], note: 'CANARY-NOTE', createdAt: day })], view: home(() => import('../../dynamis/providers/home'), 'dynamisHome') },
  {
    app: 'askesis',
    create: [{ collection: 'askesisWorkouts', value: { id: 'e1', date: TODAY, activity: 'run', seconds: 1800, meters: 5000, notes: 'CANARY-NOTE', avgHr: 98765, createdAt: day } }],
    edit: [{ collection: 'askesisWorkouts', value: { id: 'e1', date: TODAY, activity: 'run', seconds: 1800, meters: 8000, notes: 'CANARY-NOTE', avgHr: 98765, createdAt: day } }],
    async view(b) {
      vi.resetModules();
      vi.doMock('../../app/askesis/runs', () => ({
        readRuns: async () => ({ plan: {}, workouts: await b.local.list('askesisWorkouts'), unit: 'km' }),
        todaysRun: () => undefined,
        runLength: () => '',
        runTitle: (entry: { meters: number }) => `Run · ${entry.meters} m`,
      }));
      vi.doMock('../../app/family/trainingWeek', () => ({ refreshTrainingWeek: () => undefined, watchTrainingWeek: () => () => undefined }));
      return (await import('../../askesis/providers/home')).askesisHome;
    },
  },
  {
    app: 'theoria',
    create: [{ collection: 'lifeItems' as SyncCollection, value: { id: 'b1', title: 'Read: CANARY-BOOK' } }, { collection: 'itemEvents' as SyncCollection, value: { id: 'e1', itemId: 'b1', kind: 'FOCUSED', timestamp: '2026-11-05T08:00:00', metadata: { app: 'praxis', minutes: 25 } } }],
    edit: [{ collection: 'itemEvents' as SyncCollection, value: { id: 'e1', itemId: 'b1', kind: 'FOCUSED', timestamp: '2026-11-05T08:00:00', metadata: { app: 'praxis', minutes: 45 } } }],
    async view(b) {
      vi.resetModules();
      vi.doMock('../../app/services', () => ({ lifeService: { listForApp: async () => b.local.list('lifeItems' as SyncCollection), historyForAll: async () => b.local.list('itemEvents' as SyncCollection), subscribe: () => () => undefined } }));
      return (await import('../../theoria/providers/home')).theoriaHome;
    },
  },
];

const rowsOf = async (spec: Spec, b: Install, enabled?: (app: string) => boolean) => {
  const provider = await spec.view(b);
  const out = await homeRows([provider], APPS, b.ctx(enabled));
  expect(out.rejected, spec.app).toEqual([]);
  return JSON.stringify(out.rows);
};

describe.each(specs)('Home across installs: $app', (spec) => {
  beforeEach(() => localStorage.clear());

  it('creation, editing and deletion made on one install reach the other, with excluded fields kept out', async () => {
    const { remote, rows } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    await b.applyToStorage(spec.base);
    const baseline = await rowsOf(spec, b);

    for (const rec of spec.create) await putRec(a, rec);
    await a.engine.sync();
    const server = JSON.stringify([...rows.values()]);
    expect(server).not.toMatch(/CANARY|Mara|Internet|Lentil|Sertraline|Wipe|Fern|Lisbon|Biology|Dishwasher/);
    await b.engine.sync();
    await b.applyToStorage(spec.base);
    const created = await rowsOf(spec, b);
    expect(created, 'a record made elsewhere changes the lines').not.toBe(baseline);
    expect(created).not.toMatch(/CANARY|98765|31337|4242|USD/);

    for (const rec of spec.edit) await putRec(a, rec);
    await a.engine.sync();
    await b.engine.sync();
    await b.applyToStorage(spec.base);
    const edited = await rowsOf(spec, b);
    expect(edited, 'an edit changes the lines').not.toBe(created);
    expect(edited).not.toMatch(/CANARY|98765|31337|4242|USD/);

    for (const rec of [...spec.create, ...spec.edit]) await removeRec(a, rec);
    await a.engine.sync();
    await b.engine.sync();
    await b.applyToStorage(spec.base);
    expect(await rowsOf(spec, b), 'a deletion returns the lines to what they were').toBe(baseline);
  });

  it('with no connection the install still draws its own copy', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    for (const rec of spec.create) await putRec(a, rec);
    await a.engine.sync();
    await b.engine.sync();
    await b.applyToStorage(spec.base);
    const online = await rowsOf(spec, b);
    const down: RemoteStore = { pull: async () => { throw new Error('offline'); }, push: async () => { throw new Error('offline'); } };
    await expect(createSyncEngine({ local: b.local, state: createMemorySyncStateStore(), remote: down, key }).sync()).rejects.toThrow('offline');
    expect(await rowsOf(spec, b)).toBe(online);
  });

  it('an app set aside is not asked and draws nothing', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    for (const rec of spec.create) await putRec(a, rec);
    await a.applyToStorage(spec.base);
    for (const rec of spec.create) if (!rec.collection) localStorage.setItem(rec.key!, JSON.stringify(rec.value));
    const provider = await spec.view(a);
    let asked = 0;
    const counted = { ...provider, read: async (ctx: never) => { asked += 1; return provider.read(ctx); } } as Provider<'home'>;
    const out = await homeRows([counted], APPS, a.ctx((app) => app !== spec.app));
    expect(out.rows).toEqual([]);
    expect(asked).toBe(0);
  });
});

