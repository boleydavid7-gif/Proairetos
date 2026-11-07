// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { calendarLines, type CalendarLine, type HostContext, type Provider } from '../../core/providers';
import { createSyncEngine } from '../../data/sync/engine';
import { createKeys } from '../../data/sync/keys';
import { createMemoryLocalSyncStore, createMemorySyncStateStore } from '../../data/sync/localStores';
import type { LocalSyncStore, OutgoingRecord, RemoteRecord, RemoteStore, SyncCollection } from '../../data/sync/types';

/*
 * Every app that puts lines on the calendar, one parameterized table, across two installs and a stand-in server:
 * a record made on one install is a line on the other, an edit and a deletion follow, an install with no connection
 * still draws its own copy, an excluded field (a canary in it) is in no field of any line nor in plain text on the
 * server, a line is the app's own and opens inside it, a record shows once, and an app set aside or removed is not asked.
 */
const day = '2026-11-01T09:00:00.000Z';
const range = { from: new Date('2026-11-01T00:00:00'), until: new Date('2026-12-01T00:00:00') };

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
afterEach(() => localStorage.clear());

type Rec = { collection?: SyncCollection; key?: string; value: Record<string, unknown> & { id: string } };
type Spec = {
  app: string;
  create: Rec[];
  edit: Rec[];
  /** Titles after create, then after edit; `kinds` after create. */
  titles: string[];
  edited: string[];
  kinds: string[];
  provider: () => Promise<Provider<'calendar'>>;
};
type Install = ReturnType<typeof install>;

function install(remote: RemoteStore) {
  const local: LocalSyncStore = createMemoryLocalSyncStore();
  const engine = createSyncEngine({ local, state: createMemorySyncStateStore(), remote, key });
  const ctx = (enabled: (app: string) => boolean = () => true, usable: (app: string) => boolean = () => true): HostContext => ({
    today: '2026-11-05',
    now: new Date('2026-11-05T12:00:00'),
    range,
    records: async <T,>(source: string) => {
      if (!source.startsWith('local:')) return (await local.list(source as SyncCollection)) as unknown as T[];
      const prefix = source.slice(6);
      return (await local.list('preferences')).filter((record) => record.id.startsWith(prefix)).map((record) => JSON.parse(String(record.value)) as T);
    },
    setting: () => null,
    isUsable: usable,
    enabled,
  } as HostContext);
  return { local, engine, ctx };
}
const putRec = (a: Install, rec: Rec) => (rec.collection ? a.local.put(rec.collection, rec.value) : a.local.put('preferences', { id: rec.key!, value: JSON.stringify(rec.value) }));
const removeRec = (a: Install, rec: Rec) => (rec.collection ? a.local.remove(rec.collection, rec.value.id) : a.local.remove('preferences', rec.key!));
const pref = (key: string, value: Rec['value']): Rec => ({ key, value });
const load = <K extends string>(loader: () => Promise<Record<K, Provider<'calendar'>>>, name: K) => async () => (await loader())[name];

async function linesOf(spec: Spec, b: Install, enabled?: (app: string) => boolean, usable?: (app: string) => boolean) {
  const out = await calendarLines([await spec.provider()], APPS, b.ctx(enabled, usable));
  expect(out.rejected, spec.app).toEqual([]);
  return out.lines;
}
const titlesOf = (lines: CalendarLine[]) => lines.map((line) => line.title).sort();

const specs: Spec[] = [
  {
    app: 'melete',
    create: [
      pref('melete:subject:s1', { id: 's1', name: 'Biology', dates: [{ id: 'd1', title: 'Midterm', date: '2026-11-08', kind: 'exam', hours: 99 }], materials: [{ id: 'm', title: 'CANARY-MATERIAL' }], ifThen: 'CANARY-IFTHEN', rhythm: { times: 3, minutes: 45 }, createdAt: day }),
      pref('melete:session:ss1', { id: 'ss1', subjectId: 's1', kind: 'read', start: '2026-11-05T15:00:00', minutes: 30, line: 'CANARY-LINE' }),
    ],
    edit: [pref('melete:subject:s1', { id: 's1', name: 'Chemistry', dates: [{ id: 'd1', title: 'Midterm', date: '2026-11-08', kind: 'exam', hours: 99 }], materials: [{ id: 'm', title: 'CANARY-MATERIAL' }], ifThen: 'CANARY-IFTHEN', createdAt: day })],
    titles: ['Biology · Study', 'Biology: Midterm'],
    edited: ['Chemistry · Study', 'Chemistry: Midterm'],
    kinds: ['deadline', 'event'],
    provider: load(() => import('../../melete/providers/calendar'), 'meleteCalendar'),
  },
  {
    app: 'therapeia',
    create: [
      pref('therapeia:visit:v1', { id: 'v1', with: 'Dr Lee', where: 'Clinic', notes: 'CANARY-VISITNOTE', questions: [{ id: 'q', text: 'CANARY-QUESTION' }], at: '2026-11-05T15:00', createdAt: day }),
      pref('therapeia:visit:v2', { id: 'v2', with: 'Dr Okafor', who: 'Mia', at: '2026-11-06T10:30', notes: 'CANARY-VISITNOTE', questions: [], createdAt: day }),
      pref('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: 'CANARY-DOSE 50 mg', times: [{ kind: 'clock', at: '20:00' }], days: { kind: 'daily' }, start: '2026-10-01', taken: [], createdAt: day }),
    ],
    edit: [pref('therapeia:visit:v1', { id: 'v1', with: 'Dr Patel', where: 'Clinic', notes: 'CANARY-VISITNOTE', questions: [], at: '2026-11-05T15:00', createdAt: day })],
    titles: ['Dr Lee', 'Mia: Dr Okafor'],
    edited: ['Dr Patel', 'Mia: Dr Okafor'],
    kinds: ['event', 'event'],
    provider: load(() => import('../../therapeia/providers/calendar'), 'therapeiaCalendar'),
  },
  {
    app: 'ktema',
    create: [
      pref('ktema:thing:t1', { id: 't1', name: 'Dishwasher', category: 'Appliance', serial: 'CANARY-SERIAL', price: 'CANARY-PRICE', note: 'CANARY-NOTE', warrantyUntil: '2026-11-20', createdAt: day }),
      pref('ktema:thing:t2', { id: 't2', name: 'Passport', category: 'Documents', serial: 'CANARY-SERIAL', warrantyUntil: '2026-11-10', createdAt: day }),
      pref('ktema:upkeep:u1', { id: 'u1', thingId: 't1', name: 'Clean the filter', note: 'CANARY-UPKEEP', every: { count: 1, unit: 'months' }, start: '2026-11-12', history: [], createdAt: day }),
    ],
    edit: [pref('ktema:upkeep:u1', { id: 'u1', thingId: 't1', name: 'Clean the coil', note: 'CANARY-UPKEEP', every: { count: 1, unit: 'months' }, start: '2026-11-12', history: [], createdAt: day })],
    titles: ['Clean the filter · Dishwasher', 'Dishwasher: warranty ends', 'Passport: ends'],
    edited: ['Clean the coil · Dishwasher', 'Dishwasher: warranty ends', 'Passport: ends'],
    kinds: ['deadline', 'deadline', 'deadline'],
    provider: load(() => import('../../ktema/providers/calendar'), 'ktemaCalendar'),
  },
  {
    app: 'philia',
    create: [
      pref('philia:person:p1', { id: 'p1', name: 'Mara', birthday: '1984-11-08', phone: 'CANARY-PHONE', email: 'canary@example.test', notes: [{ id: 'n', text: 'CANARY-NOTE' }], gifts: [{ id: 'g', text: 'CANARY-GIFT' }], times: [], createdAt: day }),
      pref('philia:person:p2', { id: 'p2', name: 'Tomas', dates: [{ id: 'd1', label: 'Dinner', date: '2026-11-06', once: true, time: '19:00' }, { id: 'd2', label: 'Anniversary', date: '2015-11-09' }, { id: 'd3', label: 'Reunion', date: '2026-11-20', once: true }], notes: [], gifts: [], times: [], createdAt: day }),
    ],
    edit: [pref('philia:person:p1', { id: 'p1', name: 'Mara K', birthday: '1984-11-08', phone: 'CANARY-PHONE', notes: [], gifts: [], times: [], createdAt: day })],
    titles: ['Dinner · Tomas', 'Mara’s birthday', 'Tomas: Anniversary', 'Tomas: Reunion'],
    edited: ['Dinner · Tomas', 'Mara K’s birthday', 'Tomas: Anniversary', 'Tomas: Reunion'],
    kinds: ['event', 'info', 'recurring', 'recurring'],
    provider: load(() => import('../../philia/providers/calendar'), 'philiaCalendar'),
  },
  {
    app: 'oikonomia',
    create: [
      { collection: 'oikonomiaBills', value: { id: 'b1', name: 'Internet', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-07', frequency: 'monthly', category: 'CANARY-AREA', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE', payments: [], createdAt: day, updatedAt: day } },
      { collection: 'oikonomiaBills', value: { id: 'b2', name: 'Rent', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-08', frequency: 'monthly', category: 'CANARY-AREA', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE', payments: [{ id: 'p', date: '2026-11-08', amountCents: 98765432, note: 'CANARY-PAYMENT' }], createdAt: day, updatedAt: day } },
    ],
    edit: [{ collection: 'oikonomiaBills', value: { id: 'b1', name: 'Fiber', amountCents: 98765432, currency: 'USD', dueDate: '2026-11-07', frequency: 'monthly', category: 'CANARY-AREA', autopay: false, reminderDays: 3, notes: 'CANARY-NOTE', payments: [], createdAt: day, updatedAt: day } }],
    titles: ['Internet', 'Rent'],
    edited: ['Fiber', 'Rent'],
    kinds: ['deadline', 'deadline'],
    provider: load(() => import('../../oikonomia/providers/calendar'), 'oikonomiaCalendar'),
  },
  {
    app: 'poreia',
    create: [
      pref('poreia:trip:tr1', { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', notes: 'CANARY-NOTE', createdAt: day, updatedAt: day }),
      pref('poreia:booking:b1', { id: 'b1', tripId: 'tr1', kind: 'flight', title: 'TP 123', startDate: '2026-11-07', startTime: '08:15', endTime: '10:30', confirmation: 'CANARY-CODE', provider: 'CANARY-PROVIDER', createdAt: day, updatedAt: day }),
      pref('poreia:plan:pn1', { id: 'pn1', tripId: 'tr1', date: '2026-11-07', time: '09:00', title: 'Tram 28', note: 'CANARY-PLAN', createdAt: day, updatedAt: day }),
      pref('poreia:off:o1', { id: 'o1', title: 'CANARY-OFF', start: '2026-11-16', end: '2026-11-17', status: 'approved', hours: 16, createdAt: day, updatedAt: day }),
    ],
    edit: [pref('poreia:trip:tr1', { id: 'tr1', name: 'Oporto', place: { label: 'Oporto' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', notes: 'CANARY-NOTE', createdAt: day, updatedAt: day })],
    titles: ['Flight: TP 123', 'Lisbon', 'Time off', 'Tram 28'],
    edited: ['Flight: TP 123', 'Oporto', 'Time off', 'Tram 28'],
    kinds: ['event', 'event', 'info', 'info'],
    provider: load(() => import('../../poreia/providers/calendar'), 'poreiaCalendar'),
  },
];

const CANARY = /CANARY|99\b|98765|987,654|USD|\$/;

describe.each(specs)('Calendar across installs: $app', (spec) => {
  it('creation, editing and deletion made on one install reach the other, with excluded fields kept out', async () => {
    const { remote, rows } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    expect(await linesOf(spec, b)).toEqual([]);

    for (const rec of spec.create) await putRec(a, rec);
    await a.engine.sync();
    expect(JSON.stringify([...rows.values()])).not.toMatch(/CANARY|Biology|Chemistry|Midterm/);
    await b.engine.sync();
    const created = await linesOf(spec, b);
    expect(titlesOf(created)).toEqual([...spec.titles].sort());
    expect(created.map((line) => line.kind).sort()).toEqual([...spec.kinds].sort());
    expect(JSON.stringify(created)).not.toMatch(CANARY);
    const app = APPS.find((each) => each.id === spec.app)!;
    for (const line of created) {
      expect(line.ref.app).toBe(spec.app);
      expect(line.open.startsWith(app.urls.href) && !line.open.includes('//')).toBe(true);
    }

    for (const rec of spec.edit) await putRec(a, rec);
    await a.engine.sync();
    await b.engine.sync();
    const edited = await linesOf(spec, b);
    expect(titlesOf(edited)).toEqual([...spec.edited].sort());
    expect(JSON.stringify(edited)).not.toMatch(CANARY);
    // The same records are the same lines: an edit does not add a second.
    expect(edited).toHaveLength(created.length);

    for (const rec of [...spec.create, ...spec.edit]) await removeRec(a, rec);
    await a.engine.sync();
    await b.engine.sync();
    expect(await linesOf(spec, b)).toEqual([]);
  });

  it('with no connection the install still draws its own copy', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    const b = install(remote);
    for (const rec of spec.create) await putRec(a, rec);
    await a.engine.sync();
    await b.engine.sync();
    const online = await linesOf(spec, b);
    const down: RemoteStore = { pull: async () => { throw new Error('offline'); }, push: async () => { throw new Error('offline'); } };
    await expect(createSyncEngine({ local: b.local, state: createMemorySyncStateStore(), remote: down, key }).sync()).rejects.toThrow('offline');
    expect(await linesOf(spec, b)).toEqual(online);
  });

  it('shows each record once however often it is read, and an app set aside or removed is not asked', async () => {
    const { remote } = fakeServer();
    const a = install(remote);
    for (const rec of spec.create) await putRec(a, rec);
    const first = await linesOf(spec, a);
    expect(await linesOf(spec, a)).toEqual(first);
    expect(new Set(first.map((line) => `${line.ref.kind}:${line.ref.id}:${line.day}`)).size).toBe(first.length);
    const provider = await spec.provider();
    let asked = 0;
    const counted = { ...provider, read: async (ctx: never) => { asked += 1; return provider.read(ctx); } } as Provider<'calendar'>;
    expect((await calendarLines([counted], APPS, a.ctx((app) => app !== spec.app))).lines).toEqual([]);
    expect((await calendarLines([counted], APPS, a.ctx(undefined, (app) => app !== spec.app))).lines).toEqual([]);
    expect(asked).toBe(0);
  });
});
