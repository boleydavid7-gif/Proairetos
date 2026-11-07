import { billsBefore, incomeForMonth, nextPay, payDates, payView, type Pay } from '../../oikonomia/core/pay';
import type { Bill } from '../../oikonomia/core/bills';

const pay = (over: Partial<Pay>): Pay => ({ id: 'p', name: 'Pay', currency: 'USD', rhythm: 'every-2-weeks', date: '2026-10-03', ...over });
const bill = (over: Partial<Bill>): Bill => ({
  id: over.id ?? 'b', name: 'Rent', amountCents: 100000, currency: 'USD', dueDate: '2026-10-20', frequency: 'monthly',
  autopay: false, reminderDays: 3, payments: [], createdAt: '', updatedAt: '', ...over,
});

describe('pay dates', () => {
  it('follows every two weeks from one known date, either side of it', () => {
    expect(payDates(pay({}), '2026-10-10', '2026-11-10')).toEqual(['2026-10-17', '2026-10-31']);
    expect(payDates(pay({ date: '2026-12-12' }), '2026-10-10', '2026-11-10')).toEqual(['2026-10-17', '2026-10-31']);
  });

  it('takes twice a month on two days, the 31st as the month’s last day', () => {
    expect(payDates(pay({ rhythm: 'twice-monthly', date: '2026-10-15', secondDay: 31 }), '2026-10-01', '2026-11-30')).toEqual([
      '2026-10-15', '2026-10-31', '2026-11-15', '2026-11-30',
    ]);
    expect(payDates(pay({ rhythm: 'monthly', date: '2026-01-31' }), '2026-02-01', '2026-03-31')).toEqual(['2026-02-28', '2026-03-31']);
  });

  it('finds the next pay across incomes', () => {
    const found = nextPay([pay({}), pay({ id: 'q', name: 'Side', rhythm: 'monthly', date: '2026-10-12' })], '2026-10-10');
    expect(found?.date).toBe('2026-10-12');
    expect(found?.pays.map((each) => each.name)).toEqual(['Side']);
  });

  it('projects known income dates for a month and leaves unknown amounts visible', () => {
    const totals = incomeForMonth(
      [
        pay({ amountCents: 180000, rhythm: 'every-2-weeks', date: '2026-10-03' }),
        pay({ id: 'side', name: 'Side', amountCents: undefined, rhythm: 'monthly', date: '2026-10-12' }),
      ],
      '2026-10',
      'USD',
    );
    expect(totals).toEqual({ expectedCents: 540000, knownPayDates: 3, unknownPayDates: 1, otherCurrencyDates: 0 });
  });
});

describe('until pay', () => {
  const today = '2026-10-10';
  const bills = [bill({ id: 'rent' }), bill({ id: 'phone', name: 'Phone', amountCents: 5000, dueDate: '2026-10-12' }), bill({ id: 'paid', name: 'Gym', amountCents: 3000, dueDate: '2026-10-11', payments: [{ id: 'x', date: '2026-10-11', amountCents: 3000 }] })];

  it('adds up the unpaid bills before the next pay, and what is left after them', () => {
    expect(billsBefore(bills, today, '2026-10-17', today).map((each) => each.bill.id)).toEqual(['phone']);
    const view = payView([pay({ amountCents: 180000 })], bills, today, 'USD', { cents: 40000, currency: 'USD', on: today })!;
    expect(view).toMatchObject({ next: '2026-10-17', days: 7, beforeCents: 5000, leftCents: 35000 });
    expect(view.following).toEqual({ date: '2026-10-31', incomeCents: 180000, billsCents: 100000, count: 1 });
  });

  it('leaves out an amount said on another day', () => {
    expect(payView([pay({})], bills, today, 'USD', { cents: 40000, currency: 'USD', on: '2026-10-09' })?.leftCents).toBeUndefined();
  });
});
