import { describe, expect, it } from 'vitest';
import { byRoom, moneyText, readPrice, thingsCsv, totalOf } from './insurance';
import type { Thing } from './things';

const thing = (name: string, extra: Partial<Thing> = {}): Thing => ({ id: name, name, category: 'Appliance', createdAt: '2026-01-01T00:00:00Z', ...extra });

describe('insurance list', () => {
  it('reads prices as written', () => {
    expect(readPrice('$649')).toEqual({ amount: 649, mark: '$' });
    expect(readPrice('£1,200.50')).toEqual({ amount: 1200.5, mark: '£' });
    expect(readPrice('1.200,50 €')).toEqual({ amount: 1200.5, mark: '€' });
    expect(readPrice('12,50')).toEqual({ amount: 12.5, mark: '' });
    expect(readPrice('1.200')).toEqual({ amount: 1200, mark: '' });
    expect(readPrice('2499 kr')).toEqual({ amount: 2499, mark: 'kr' });
    expect(readPrice('a gift')).toBeUndefined();
    expect(readPrice('')).toBeUndefined();
  });

  it('adds up by currency and counts what has no price', () => {
    const list = [thing('Fridge', { price: '$1,100' }), thing('Laptop', { price: '$899.99' }), thing('Bike', { price: '£300' }), thing('Lamp')];
    expect(totalOf(list)).toEqual({ totals: [{ mark: '$', amount: 1999.99 }, { mark: '£', amount: 300 }], unpriced: 1 });
    expect(moneyText({ mark: 'kr', amount: 2499 })).toMatch(/^2.?499 kr$/);
  });

  it('groups by room with the unplaced last, ignoring case', () => {
    const rooms = byRoom([thing('TV', { place: 'Living room' }), thing('Drill'), thing('Sofa', { place: 'living room' }), thing('Fridge', { place: 'Kitchen' })]);
    expect(rooms.map(([room, list]) => [room, list.map((each) => each.name)])).toEqual([
      ['Kitchen', ['Fridge']],
      ['Living room', ['Sofa', 'TV']],
      ['No room set', ['Drill']],
    ]);
  });

  it('writes CSV with the amount as a number', () => {
    const csv = thingsCsv([thing('Fridge', { place: 'Kitchen', price: '$1,100', serial: 'AB"1' })]).split('\r\n');
    expect(csv[0].startsWith('"Room","Thing"')).toBe(true);
    expect(csv[1]).toBe('"Kitchen","Fridge","Appliance","","","AB""1","","$1,100","1100","","",""');
  });
});
