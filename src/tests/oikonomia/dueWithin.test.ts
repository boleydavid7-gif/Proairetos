import { describe, expect, it } from 'vitest';
import { dueWithin, remainingSummary, type Bill } from '../../oikonomia/core/bills';

const bill = (id: string, name: string, dueDate: string, amountCents: number, extra: Partial<Bill> = {}): Bill => ({
  id, name, amountCents, currency: 'USD', dueDate, frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...extra,
});

const today = '2026-11-05';

describe('what is due in the next seven days', () => {
  it('holds the unpaid bills due within the week and adds only those', () => {
    const list = [bill('a', 'Rent', '2026-11-08', 120000), bill('b', 'Phone', '2026-11-12', 4500), bill('c', 'Internet', '2026-11-20', 6000)];
    expect(dueWithin(list, today).map(({ bill: each }) => each.name)).toEqual(['Rent', 'Phone']);
    expect(remainingSummary(dueWithin(list, today), today).main).toBe('$1,245.00');
  });

  it('does not bring a bill paid this month back as next month’s', () => {
    const paid = bill('a', 'Rent', '2026-11-01', 120000, { payments: [{ id: 'p', date: '2026-11-01', amountCents: 120000 }] });
    expect(dueWithin([paid], today)).toEqual([]);
    expect(dueWithin([paid], '2026-11-26', 7).map(({ date }) => date)).toEqual(['2026-12-01']);
  });

  it('counts a weekly bill once a week', () => {
    const weekly = bill('w', 'Cleaner', '2026-10-30', 5000, { frequency: 'weekly' });
    expect(dueWithin([weekly], today).map(({ date }) => date)).toEqual(['2026-11-06']);
  });

  it('keeps a date that came and was not paid until the next one takes over', () => {
    const waiting = bill('a', 'Water', '2026-11-03', 8000);
    expect(dueWithin([waiting], today).map(({ date }) => date)).toEqual(['2026-11-03']);
  });

  it('leaves autopay dates that have already come, and budget out of it', () => {
    const auto = bill('a', 'Gym', '2026-11-04', 3000, { autopay: true });
    expect(dueWithin([auto], today)).toEqual([]);
  });
});
