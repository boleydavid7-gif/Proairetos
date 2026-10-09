// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { billsSoon, ouncesToday } from '../../app/family/glance';
import { setTodayPartShown, todayHiddenSnapshot } from '../../data/storage/preferences';
import type { Bill } from '../../oikonomia/core/bills';

const bill = (over: Partial<Bill>): Bill => ({
  id: 'b',
  name: 'Rent',
  amountCents: 100,
  currency: 'USD',
  dueDate: '2026-10-10',
  frequency: 'monthly',
  autopay: false,
  reminderDays: 3,
  payments: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('bills coming up on Today', () => {
  it('lists bills from today through three days ahead, with plain words for when', () => {
    const soon = billsSoon([bill({ dueDate: '2026-10-09', name: 'Electric', frequency: 'once' }), bill({ dueDate: '2026-10-10' }), bill({ dueDate: '2026-10-12', name: 'Water' }), bill({ dueDate: '2026-10-20', name: 'Far' })], '2026-10-09');
    expect(soon.map((b) => `${b.name} ${b.when}`)).toEqual(['Electric today', 'Rent tomorrow', 'Water in 3 days']);
  });

  it('leaves out a date that has a payment recorded, and anything already past', () => {
    expect(billsSoon([bill({ dueDate: '2026-10-10', payments: [{ date: '2026-10-10' } as never] })], '2026-10-09')).toEqual([]);
    expect(billsSoon([bill({ dueDate: '2026-10-01', frequency: 'once' })], '2026-10-09')).toEqual([]);
  });

  it('finds the next time of a repeating bill', () => {
    expect(billsSoon([bill({ dueDate: '2026-08-10', frequency: 'monthly' })], '2026-10-09').map((b) => b.date)).toEqual(['2026-10-10']);
  });
});

describe('what was drunk today', () => {
  it('adds only the local day asked for', () => {
    const noon = new Date(2026, 9, 9, 12).toISOString();
    const yesterday = new Date(2026, 9, 8, 12).toISOString();
    expect(ouncesToday([{ amountOz: 8, loggedAt: noon }, { amountOz: 16, loggedAt: noon }, { amountOz: 40, loggedAt: yesterday }], '2026-10-09')).toBe(24);
  });
});

describe('parts that start off', () => {
  beforeEach(() => localStorage.clear());

  it('stay off until chosen, and can be set aside again', () => {
    expect(todayHiddenSnapshot().split(',')).toEqual(expect.arrayContaining(['bills', 'water', 'reading']));
    setTodayPartShown('bills', true);
    expect(todayHiddenSnapshot().split(',')).not.toContain('bills');
    setTodayPartShown('bills', false);
    expect(todayHiddenSnapshot().split(',')).toContain('bills');
  });
});

import { billsOn } from '../../app/family/glance';

describe('bills in the calendar', () => {
  it('lists the bills with a date on one day, paid ones marked', () => {
    const day = billsOn(
      [bill({ name: 'Rent', dueDate: '2026-10-10' }), bill({ id: 'p', name: 'Phone', dueDate: '2026-09-10', payments: [{ date: '2026-10-10' } as never] }), bill({ id: 'x', name: 'Other', dueDate: '2026-10-11' })],
      '2026-10-10',
    );
    expect(day.map((line) => [line.name, line.paid])).toEqual([['Phone', true], ['Rent', false]]);
    expect(day[1].amount).toBe('$1.00');
  });
});
