// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
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
