import { describe, expect, it } from 'vitest';
import { readAmount } from '../../core/money/readAmount';
import type { Trip } from '../../poreia/core/model';
import { budgetYears, yearSpending, yearTrips } from '../../poreia/core/yearBudget';

const trip = (id: string, start: string | undefined, budget?: number, currency = 'USD'): Trip =>
  ({ id, name: id, start, end: start, travelers: 1, stage: 'idea', budget: budget ? { cents: budget, currency } : undefined, createdAt: '', updatedAt: '' }) as Trip;

describe('yearTrips', () => {
  const list = [trip('a', '2027-03-01', 100000), trip('b', '2027-08-10'), trip('c', '2028-01-05', 50000), trip('d', undefined, 90000)];
  const bookings = [{ tripId: 'b', kind: 'stay' as const, cost: { cents: 40000, currency: 'USD' } }, { tripId: 'a', kind: 'stay' as const, cost: { cents: 120000, currency: 'USD' } }];

  it('counts each trip of the year at its budget, or what it cost when more', () => {
    // a: cost 1,200 over its 1,000 budget; b: no budget, 400 booked; c is next year, d has no date.
    expect(yearTrips(list, bookings, [], 2027, 'USD', {})).toEqual({ cents: 160000, count: 2, unconverted: 0 });
  });

  it('leaves out the trip being edited', () => {
    expect(yearTrips(list, bookings, [], 2027, 'USD', {}, 'a').cents).toBe(40000);
  });

  it('converts budgets in another currency and says when it cannot', () => {
    const euros = [trip('e', '2027-05-01', 100000, 'EUR')];
    expect(yearTrips(euros, [], [], 2027, 'USD', { EUR: 1.1 }).cents).toBe(110000);
    expect(yearTrips(euros, [], [], 2027, 'USD', {})).toEqual({ cents: 0, count: 1, unconverted: 1 });
  });
});

describe('readAmount', () => {
  it('reads thousands either way and tells blank from unreadable', () => {
    expect(readAmount('3,500')).toBe(350000);
    expect(readAmount('3.500,50')).toBe(350050);
    expect(readAmount('12,50')).toBe(1250);
    expect(readAmount('')).toBeNull();
    expect(readAmount('1.234')).toBeUndefined();
  });
});

describe('yearSpending', () => {
  const list = [trip('a', '2027-03-01', 100000), trip('b', '2027-08-10'), trip('c', '2028-01-05', 50000)];
  const bookings = [{ tripId: 'a', kind: 'stay' as const, cost: { cents: 60000, currency: 'USD' } }, { tripId: 'b', kind: 'flight' as const, cost: { cents: 30000, currency: 'EUR' } }];
  const spends = [{ tripId: 'a', amount: { cents: 5000, currency: 'USD' }, category: 'food' as const }, { tripId: 'c', amount: { cents: 999, currency: 'USD' }, category: 'food' as const }];

  it('adds up the year by trip and by kind', () => {
    const year = yearSpending(list, bookings, spends, 2027, 'USD', { EUR: 1.1 });
    expect(year.spent).toBe(65000 + 33000);
    expect(year.planned).toBe(100000 + 33000);
    expect(year.byCategory.get('stay')).toBe(60000);
    expect(year.byCategory.get('food')).toBe(5000);
    expect(year.byCategory.get('travel')).toBe(33000);
    expect(year.trips).toEqual([{ id: 'a', cost: 65000, budget: 100000 }, { id: 'b', cost: 33000 }]);
    expect(year.unconverted).toEqual([]);
  });

  it('lists what it cannot convert', () => {
    const year = yearSpending(list, bookings, spends, 2027, 'USD', {});
    expect(year.spent).toBe(65000);
    expect(year.unconverted).toEqual([{ cents: 30000, currency: 'EUR' }]);
  });

  it('offers this year, the next and every trip year', () => {
    expect(budgetYears(list, 2026)).toEqual([2026, 2027, 2028]);
  });
});
