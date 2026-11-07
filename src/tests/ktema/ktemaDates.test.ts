import { describe, expect, it } from 'vitest';
import type { HostContext } from '../../core/providers';
import { ktemaCalendar } from '../../ktema/providers/calendar';
import type { Thing, Upkeep } from '../../ktema/core/things';

const thing = (patch: Partial<Thing>): Thing => ({ id: 't1', name: 'Dishwasher', category: 'Appliance', createdAt: '2026-01-01', ...patch });
const upkeep = (patch: Partial<Upkeep>): Upkeep => ({ id: 'u1', name: 'Clean the filter', every: { count: 3, unit: 'months' }, start: '2026-11-10', history: [], createdAt: '2026-01-01', ...patch });
/** Ktema's lines on one day, the way Days ahead asks for them. */
async function on(things: Thing[], upkeeps: Upkeep[], date: string) {
  const ctx = {
    today: date,
    now: new Date(`${date}T12:00:00`),
    range: { from: new Date(`${date}T00:00:00`), until: new Date(`${date}T23:59:59`) },
    records: async <T,>(source: string) => (source === 'local:ktema:thing:' ? things : upkeeps) as unknown as T[],
  } as unknown as HostContext;
  return ktemaCalendar.read(ctx) as Promise<{ title: string; open: string }[]>;
}

describe('Ktema dates in Days ahead', () => {
  it('lists a warranty or document that ends on its day', async () => {
    const things = [thing({ warrantyUntil: '2026-12-01' }), thing({ id: 't2', name: 'Passport', category: 'Documents', warrantyUntil: '2026-12-01' })];
    expect((await on(things, [], '2026-12-01')).map((line) => line.title)).toEqual(['Dishwasher: warranty ends', 'Passport: ends']);
    expect(await on(things, [], '2026-12-02')).toEqual([]);
  });
  it('lists an upkeep on the day it comes round, with its thing', async () => {
    const lines = await on([thing({})], [upkeep({ thingId: 't1' })], '2026-11-10');
    expect(lines.map((line) => [line.title, line.open])).toEqual([['Clean the filter · Dishwasher', '/ktema/?open=upkeep%3Au1']]);
  });
  it('moves the upkeep to its next date once it is done', async () => {
    const done = upkeep({ history: [{ date: '2026-11-10' }] });
    expect(await on([], [done], '2026-11-10')).toEqual([]);
    expect(await on([], [done], '2027-02-10')).toHaveLength(1);
  });
});
