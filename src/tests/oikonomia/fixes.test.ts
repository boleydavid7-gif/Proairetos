import { describe, expect, it } from 'vitest';
import {
  monthCells,
  paidForOccurrence,
  paymentHistory,
  relativeDue,
  remainingSummary,
  standing,
  stillToCome,
  occurrencesBetween,
  usualAmount,
  withPayment,
  type Bill,
} from '../../oikonomia/core/bills';
import { billReminders } from '../../oikonomia/core/reminders';
import { noticesBetween, defaultNoticeSettings } from '../../core/notify/notices';
import { findJudgmentLanguage as languageViolations } from '../../core/rules/languageRules';

const bill = (over: Partial<Bill> = {}): Bill => ({
  id: 'b',
  name: 'Rent',
  amountCents: 100000,
  currency: 'USD',
  dueDate: '2026-10-01',
  frequency: 'monthly',
  autopay: false,
  reminderDays: 3,
  payments: [],
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '',
  ...over,
});

describe('a date that came without a payment', () => {
  it('stays the bill’s date, worded calmly, until the next one is near', () => {
    expect(standing(bill(), '2026-10-10')).toEqual({ date: '2026-10-01', settled: false });
    expect(relativeDue('2026-10-01', '2026-10-10')).toMatch(/^Was due /);
    expect(standing(bill(), '2026-10-26')).toEqual({ date: '2026-11-01', settled: false });
  });

  it('then quietly passes: not counted as left to pay', () => {
    const month = occurrencesBetween(bill({ frequency: 'weekly', amountCents: 1000, dueDate: '2026-10-01' }), '2026-10-01', '2026-10-31');
    // Oct 1 and 8 came unpaid; the next date (Oct 15) is already within a week, so both have passed.
    expect(stillToCome(month, '2026-10-10').map(({ date }) => date)).toEqual(['2026-10-15', '2026-10-22', '2026-10-29']);
    expect(remainingSummary(month, '2026-10-10').main).toBe('$30.00');
  });

  it('a one-time bill keeps its date until it is marked paid', () => {
    expect(standing(bill({ frequency: 'once' }), '2026-10-10')).toEqual({ date: '2026-10-01', settled: false });
    expect(standing(withPayment(bill({ frequency: 'once' }), '2026-10-01', 'p'), '2026-10-10')).toMatchObject({ settled: true, complete: true });
  });

  it('no score-like words in what a bill says', () => {
    for (const day of ['2026-09-01', '2026-10-01', '2026-10-09', '2026-10-10', '2026-10-30']) {
      expect(languageViolations(relativeDue(day, '2026-10-10'))).toEqual([]);
      expect(relativeDue(day, '2026-10-10')).not.toMatch(/past|late/i);
    }
  });
});

describe('autopay', () => {
  const auto = bill({ autopay: true, dueDate: '2026-10-14' });
  it('counts a date as paid once it has come', () => {
    expect(paidForOccurrence(auto, '2026-10-14', '2026-10-13')).toBeUndefined();
    expect(paidForOccurrence(auto, '2026-10-14', '2026-10-14')).toMatchObject({ auto: true, amountCents: 100000 });
    expect(standing(auto, '2026-10-14').settled).toBe(true);
  });

  it('shows in the history', () => {
    expect(paymentHistory(auto, '2026-12-20').map((payment) => payment.date)).toEqual(['2026-12-14', '2026-11-14', '2026-10-14']);
  });
});

describe('what was actually paid', () => {
  it('records the amount and counts it in totals', () => {
    const electric = withPayment(bill({ amountCents: 8000, dueDate: '2026-11-01' }), '2026-11-01', 'p', new Date(), 9240);
    expect(electric.payments[0].amountCents).toBe(9240);
    expect(remainingSummary([{ bill: electric, date: '2026-11-01' }], '2026-10-10')).toEqual({ main: '$92.40', note: 'all paid' });
  });

  it('says what it usually comes to when that differs', () => {
    let electric = bill({ amountCents: 8000 });
    expect(usualAmount(electric)).toBeUndefined();
    electric = withPayment(electric, '2026-08-01', 'a', new Date(), 9000);
    electric = withPayment(electric, '2026-09-01', 'b', new Date(), 9400);
    electric = withPayment(electric, '2026-10-01', 'c', new Date(), 8800);
    expect(usualAmount(electric)).toBe(9000);
  });
});

describe('no more dates', () => {
  it('stops the dates after it and keeps the history', () => {
    const ended = withPayment(bill({ endedOn: '2026-10-10' }), '2026-10-01', 'p');
    expect(occurrencesBetween(ended, '2026-10-01', '2027-01-01').map(({ date }) => date)).toEqual(['2026-10-01']);
    expect(standing(ended, '2026-10-12')).toMatchObject({ settled: true, complete: true });
    expect(ended.payments).toHaveLength(1);
  });
});

describe('calendar weeks', () => {
  it('starts on the chosen day', () => {
    expect(monthCells(new Date(2026, 9, 1, 12), 1)[0]).toBe('2026-09-28');
    expect(monthCells(new Date(2026, 9, 1, 12), 0)[0]).toBe('2026-09-27');
  });
});

describe('bill reminders', () => {
  it('come on the morning of the lead day, none for a paid date', () => {
    const phone = bill({ id: 'p', name: 'Phone', amountCents: 4500, dueDate: '2026-10-21', reminderDays: 3 });
    const reminders = billReminders([phone, withPayment(bill({ dueDate: '2026-10-20' }), '2026-10-20', 'x')], '2026-10-10', '2026-10-24');
    expect(reminders.map((r) => [r.day, r.title])).toEqual([['2026-10-18', 'Phone · $45.00']]);
    const notices = noticesBetween({
      items: [],
      decisions: [],
      events: [],
      blocks: [],
      bills: reminders,
      settings: defaultNoticeSettings,
      now: new Date(2026, 9, 10, 8),
      until: new Date(2026, 9, 24),
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'bill', open: 'oikonomia:bill:p' });
    expect(notices[0].at.getHours()).toBe(9);
    expect(noticesBetween({ items: [], decisions: [], events: [], blocks: [], bills: reminders, settings: { ...defaultNoticeSettings, bills: false }, now: new Date(2026, 9, 10, 8), until: new Date(2026, 9, 24) })).toHaveLength(0);
  });
});
