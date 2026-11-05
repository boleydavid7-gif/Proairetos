import { describe, expect, it } from 'vitest';
import { ktemaDatesOn } from '../../app/calendars/ktemaDates';
import type { Thing, Upkeep } from '../../ktema/core/things';

const thing = (patch: Partial<Thing>): Thing => ({ id: 't1', name: 'Dishwasher', category: 'Appliance', createdAt: '2026-01-01', ...patch });
const upkeep = (patch: Partial<Upkeep>): Upkeep => ({ id: 'u1', name: 'Clean the filter', every: { count: 3, unit: 'months' }, start: '2026-11-10', history: [], createdAt: '2026-01-01', ...patch });

describe('Ktema dates in Days ahead', () => {
  it('lists a warranty or document that ends on its day', () => {
    const things = [thing({ warrantyUntil: '2026-12-01' }), thing({ id: 't2', name: 'Passport', category: 'Documents', warrantyUntil: '2026-12-01' })];
    expect(ktemaDatesOn(things, [], '2026-12-01').map((line) => line.name)).toEqual(['Dishwasher: warranty ends', 'Passport: ends']);
    expect(ktemaDatesOn(things, [], '2026-12-02')).toEqual([]);
  });
  it('lists an upkeep on the day it comes round, with its thing', () => {
    const lines = ktemaDatesOn([thing({})], [upkeep({ thingId: 't1' })], '2026-11-10');
    expect(lines).toEqual([{ id: 'ktema:upkeep:u1', name: 'Clean the filter · Dishwasher', href: '/ktema/?open=upkeep%3Au1' }]);
  });
  it('moves the upkeep to its next date once it is done', () => {
    const done = upkeep({ history: [{ date: '2026-11-10' }] });
    expect(ktemaDatesOn([], [done], '2026-11-10')).toEqual([]);
    expect(ktemaDatesOn([], [done], '2027-02-10')).toHaveLength(1);
  });
});
