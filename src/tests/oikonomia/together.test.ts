import { describe, expect, it } from 'vitest';
import { forSharing, PAYMENTS_SHARED, withOlderPayments } from '../../oikonomia/app/together';
import { mergeRecords } from '../../app/family/recordMerge';
import type { Bill, BillPayment } from '../../oikonomia/core/bills';

const payment = (n: number): BillPayment => ({ id: `p${n}`, date: `2025-${String(1 + (n % 12)).padStart(2, '0')}-${String(1 + Math.floor(n / 12)).padStart(2, '0')}`, amountCents: 100 });
const bill = (payments: BillPayment[]): Bill => ({ id: 'b', name: 'Rent', amountCents: 100, currency: 'USD', dueDate: '2026-11-01', frequency: 'monthly', autopay: false, reminderDays: 3, payments, createdAt: '', updatedAt: '' });
const sorted = (list: BillPayment[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));

describe('bills and expenses in a household', () => {
  it('shares the latest payments of a bill and keeps the older ones on each phone', () => {
    const many = sorted(Array.from({ length: PAYMENTS_SHARED + 6 }, (_, n) => payment(n)));
    const shared = forSharing(bill(many));
    expect(shared.payments).toHaveLength(PAYMENTS_SHARED);
    expect(shared.payments[0]).toEqual(many[6]);
    // Another phone's copy of the bill arrives: this phone's older payments stay beside it.
    const merged = withOlderPayments(shared, bill(many));
    expect(merged.payments.map((each) => each.id)).toEqual(many.map((each) => each.id));
    // A payment the other person took back is not brought back from this phone's side.
    const withoutOne = { ...shared, payments: shared.payments.filter((_, index) => index !== 3) };
    expect(withOlderPayments(withoutOne, bill(many)).payments.some((each) => each.id === shared.payments[3].id)).toBe(false);
    // A short list is taken as it comes.
    const few = bill([payment(1)]);
    expect(withOlderPayments(few, bill(many))).toBe(few);
  });

  it('lets a removal on one phone carry to the other, and a new line on either go across', () => {
    const line = (id: string) => ({ id: `spent:${id}`, kind: 'spent' as const, record: { id, date: '2026-11-02', description: 'Milk', amountCents: 400, area: 'Food' } });
    const seen = { 'spent:a': 'x' };
    // Alex took line a off the shared list; Sam still has it and had not changed it.
    const merge = mergeRecords(new Map([['spent:a', line('a')], ['spent:n', line('n')]]), new Map(), seen as never);
    expect(merge.removeLocal.map((item) => item.id)).toEqual(['spent:a']);
    expect(merge.toShared.map((item) => item.id)).toEqual(['spent:n']);
  });
});
