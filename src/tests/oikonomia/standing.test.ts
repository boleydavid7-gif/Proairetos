import { describe, expect, it } from 'vitest';
import { standing, withPayment, type Bill } from '../../oikonomia/core/bills';

const bill = (over: Partial<Bill> = {}): Bill => ({
  id: 'b',
  name: 'Rent',
  amountCents: 100000,
  currency: 'USD',
  dueDate: '2026-11-01',
  frequency: 'monthly',
  autopay: false,
  reminderDays: 3,
  payments: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('where a bill stands', () => {
  it('is about its coming date until it is paid', () => {
    expect(standing(bill(), '2026-10-25')).toEqual({ date: '2026-11-01', settled: false });
  });

  it('leaves the list once paid, and says when it comes back', () => {
    const paid = withPayment(bill(), '2026-11-01', 'p1');
    expect(standing(paid, '2026-10-25')).toEqual({ date: '2026-11-01', settled: true, returnsOn: '2026-11-24' });
  });

  it('comes back a week before its next date', () => {
    const paid = withPayment(bill(), '2026-11-01', 'p1');
    expect(standing(paid, '2026-11-23').settled).toBe(true);
    expect(standing(paid, '2026-11-25')).toEqual({ date: '2026-12-01', settled: false });
  });

  it('a longer reminder lead brings it back sooner', () => {
    const paid = withPayment(bill({ reminderDays: 14 }), '2026-11-01', 'p1');
    expect(standing(paid, '2026-11-17')).toEqual({ date: '2026-12-01', settled: false });
  });

  it('a one-time bill that is paid is complete', () => {
    const once = withPayment(bill({ frequency: 'once' }), '2026-11-01', 'p1');
    expect(standing(once, '2026-10-25')).toMatchObject({ settled: true, complete: true });
  });

  it('paying a date twice keeps one payment', () => {
    const twice = withPayment(withPayment(bill(), '2026-11-01', 'p1'), '2026-11-01', 'p2');
    expect(twice.payments).toHaveLength(1);
    expect(twice.payments[0].id).toBe('p1');
  });
});

import { formatTotals, stillToCome } from '../../oikonomia/core/bills';

describe('totals', () => {
  const rent = bill();
  const phone = bill({ id: 'p', name: 'Phone', amountCents: 4550 });
  const paidPhone = withPayment(phone, '2026-11-05', 'x');
  const set = [
    { bill: rent, date: '2026-11-01' },
    { bill: paidPhone, date: '2026-11-05' },
  ];

  it('adds up what is listed, and what is still to come', () => {
    expect(formatTotals(set)).toBe('$1,045.50');
    expect(formatTotals(stillToCome(set))).toBe('$1,000.00');
  });

  it('keeps currencies apart', () => {
    expect(formatTotals([{ bill: rent, date: 'x' }, { bill: bill({ currency: 'EUR', amountCents: 2000 }), date: 'y' }])).toBe('$1,000.00 + €20.00');
  });
});
