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
