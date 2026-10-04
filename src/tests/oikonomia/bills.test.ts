import { addMonths, monthCells, nextBills, occurrenceOnOrAfter, occurrencesBetween, type Bill } from '../../oikonomia/core/bills';
import { billCalendarText } from '../../oikonomia/core/calendar';

const bill = (change: Partial<Bill> = {}): Bill => ({
  id: 'electric',
  name: 'Electric',
  amountCents: 7824,
  currency: 'USD',
  dueDate: '2026-01-31',
  frequency: 'monthly',
  autopay: false,
  reminderDays: 3,
  payments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...change,
});

describe('Oikonomia bill dates', () => {
  it('keeps month-end bills inside the next month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('finds recurring occurrences and one-time bills', () => {
    expect(occurrenceOnOrAfter(bill(), '2026-02-01')?.date).toBe('2026-02-28');
    expect(occurrencesBetween(bill(), '2026-01-01', '2026-04-30').map((item) => item.date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(occurrenceOnOrAfter(bill({ frequency: 'once', dueDate: '2026-01-04' }), '2026-01-05')).toBeUndefined();
  });

  it('orders the next bill from each record', () => {
    const next = nextBills([bill(), bill({ id: 'rent', name: 'Rent', dueDate: '2026-01-05', amountCents: 120000 })], '2026-01-01', 5);
    expect(next.map((item) => item.bill.name)).toEqual(['Rent', 'Electric']);
  });

  it('writes stable all-day calendar events', () => {
    const text = billCalendarText([bill()], '2026-01-01');
    expect(text).toContain('UID:oikonomia-electric-2026-01-31@proairetos');
    expect(text).toContain('SUMMARY:Electric · $78.24');
  });

  it('makes a six-week calendar grid', () => {
    expect(monthCells(new Date(2026, 9, 1, 12))).toHaveLength(42);
  });
});
