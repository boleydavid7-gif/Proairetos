import { afterEach, describe, expect, it } from 'vitest';
import { addDays, addMonths, occurrenceBefore, occurrenceOnOrAfter, occurrencesBetween, paymentHistory, standing, type Bill, type BillFrequency } from '../../oikonomia/core/bills';

/*
 * A bill's dates are found from the calendar, not by counting from its first date. These hold the new functions to the
 * walk they replaced (written out here without its 500-step limit) for every frequency, the days at the end of a month,
 * 29 February, a bill that has ended, and ranges before, inside and after its first date, in several time zones.
 */
const FREQUENCIES: BillFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'once'];
const DUE_DATES = ['2026-01-31', '2026-01-29', '2024-02-29', '2026-03-30', '2025-12-31', '2026-06-15', '2030-05-31'];
const ENDED = [undefined, '2026-09-15'];
const RANGES: [string, string][] = [['2025-01-01', '2025-12-31'], ['2026-02-01', '2026-02-28'], ['2026-03-01', '2027-03-01'], ['2030-01-01', '2030-12-31'], ['2026-01-31', '2026-01-31'], ['2024-02-29', '2024-03-01'], ['2028-02-01', '2028-03-31']];

const bill = (change: Partial<Bill>): Bill => ({ id: 'b', name: 'Bill', amountCents: 100, currency: 'USD', dueDate: '2026-01-31', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', ...change });

// The walk the new code replaces, with no limit on how far it counts.
const dateAt = (b: Bill, i: number) => (b.frequency === 'weekly' ? addDays(b.dueDate, i * 7) : b.frequency === 'monthly' ? addMonths(b.dueDate, i) : b.frequency === 'quarterly' ? addMonths(b.dueDate, i * 3) : b.frequency === 'yearly' ? addMonths(b.dueDate, i * 12) : b.dueDate);
const ended = (b: Bill, date: string) => b.endedOn !== undefined && date > b.endedOn;
const LIMIT = 30_000;
function refOnOrAfter(b: Bill, from: string) {
  for (let i = 0; i < LIMIT; i += 1) {
    const date = dateAt(b, i);
    if (ended(b, date)) return undefined;
    if (date >= from) return date;
    if (b.frequency === 'once') return undefined;
  }
  return undefined;
}
function refBetween(b: Bill, from: string, until: string) {
  const out: string[] = [];
  for (let i = 0; i < LIMIT; i += 1) {
    const date = dateAt(b, i);
    if (date > until || ended(b, date)) break;
    if (date >= from) out.push(date);
    if (b.frequency === 'once') break;
  }
  return out;
}
function refBefore(b: Bill, date: string) {
  let last: string | undefined;
  for (let i = 0; i < LIMIT; i += 1) {
    const day = dateAt(b, i);
    if (day >= date) break;
    last = day;
    if (b.frequency === 'once') break;
  }
  return last;
}

const original = process.env.TZ;
afterEach(() => { process.env.TZ = original; });

describe.each(['UTC', 'Pacific/Auckland', 'America/Los_Angeles'])('a bill’s dates are the same as before, in %s', (zone) => {
  it('finds the same dates in a range, the same first date on or after a day, and the same date before a day', () => {
    process.env.TZ = zone;
    let compared = 0;
    for (const frequency of FREQUENCIES) for (const dueDate of DUE_DATES) for (const endedOn of ENDED) {
      const b = bill({ frequency, dueDate, ...(endedOn ? { endedOn } : {}) });
      for (const [from, until] of RANGES) {
        expect(occurrencesBetween(b, from, until).map((each) => each.date), `${frequency} ${dueDate} ${endedOn} ${from}..${until}`).toEqual(refBetween(b, from, until));
        expect(occurrenceOnOrAfter(b, from)?.date, `on or after ${frequency} ${dueDate} ${endedOn} ${from}`).toBe(refOnOrAfter(b, from));
        expect(occurrenceBefore(b, from), `before ${frequency} ${dueDate} ${endedOn} ${from}`).toBe(refBefore(b, from));
        expect(occurrenceOnOrAfter(b, until)?.date).toBe(refOnOrAfter(b, until));
        expect(occurrenceBefore(b, until)).toBe(refBefore(b, until));
        compared += 1;
      }
    }
    expect(compared).toBe(FREQUENCIES.length * DUE_DATES.length * ENDED.length * RANGES.length);
  });
  it('every day around each bill’s dates gives the same first date on or after it, month ends and 29 February included', () => {
    process.env.TZ = zone;
    for (const frequency of ['monthly', 'quarterly', 'yearly'] as const) for (const dueDate of ['2026-01-31', '2024-02-29', '2025-08-30']) {
      const b = bill({ frequency, dueDate });
      for (let day = '2025-12-01'; day <= '2028-04-15'; day = addDays(day, 1)) {
        if (occurrenceOnOrAfter(b, day)?.date !== refOnOrAfter(b, day)) throw new Error(`${frequency} ${dueDate} from ${day}`);
        if (occurrenceBefore(b, day) !== refBefore(b, day)) throw new Error(`${frequency} ${dueDate} before ${day}`);
      }
    }
  });
});

describe('an old bill costs no more than a new one', () => {
  it('a weekly bill first due in 1990 has its dates in a range today, 52 in a year', () => {
    const b = bill({ frequency: 'weekly', dueDate: '1990-01-01', createdAt: '1990-01-01T00:00:00.000Z' });
    const year = occurrencesBetween(b, '2026-01-01', '2026-12-31').map((each) => each.date);
    expect(year).toHaveLength(52);
    expect(year[0]).toBe('2026-01-05');
    expect(year.every((date, index) => index === 0 || date === addDays(year[index - 1], 7))).toBe(true);
    expect(occurrenceOnOrAfter(b, '2026-11-06')?.date).toBe('2026-11-09');
    expect(occurrenceBefore(b, '2026-11-06')).toBe('2026-11-02');
  });
  it('a monthly bill from 1950 and a yearly bill from 1900 keep their day of the month', () => {
    expect(occurrencesBetween(bill({ frequency: 'monthly', dueDate: '1950-01-31' }), '2026-01-01', '2026-06-30').map((each) => each.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
    expect(occurrencesBetween(bill({ frequency: 'yearly', dueDate: '1900-02-28' }), '2027-01-01', '2028-12-31').map((each) => each.date)).toEqual(['2027-02-28', '2028-02-28']);
  });
  it('a range of many years is not cut short: a weekly bill over twenty years gives every week', () => {
    const dates = occurrencesBetween(bill({ frequency: 'weekly', dueDate: '2006-01-02' }), '2006-01-01', '2026-01-01');
    expect(dates).toHaveLength(1044);
    expect(dates.at(-1)?.date).toBe('2025-12-29');
  });
  it('the bill list treats a weekly bill from twelve years ago as current, not finished', () => {
    const b = bill({ frequency: 'weekly', dueDate: '2014-01-06', createdAt: '2014-01-01T00:00:00.000Z' });
    const stand = standing(b, '2026-11-06');
    expect(stand.complete).toBeUndefined();
    expect(stand.date >= '2026-11-02' && stand.date <= '2026-11-09').toBe(true);
  });
  it('takes the same time for a bill from 1990 as for one from last month', () => {
    const old = bill({ frequency: 'weekly', dueDate: '1990-01-01' });
    const recent = bill({ frequency: 'weekly', dueDate: '2026-10-05' });
    const time = (b: Bill) => { const at = performance.now(); for (let i = 0; i < 200; i += 1) occurrencesBetween(b, '2026-11-01', '2026-11-30'); return performance.now() - at; };
    time(old);
    expect(time(old)).toBeLessThan(time(recent) * 5 + 20);
  });
});

describe('history and the limit on one call', () => {
  it('a weekly autopay bill from thirty years ago still lists its newest payments first, none cut off', () => {
    const b = bill({ frequency: 'weekly', dueDate: '1996-01-01', autopay: true, createdAt: '1996-01-01T00:00:00.000Z' });
    const history = paymentHistory(b, '2026-11-06', 24);
    expect(history).toHaveLength(24);
    expect(history[0].date).toBe('2026-11-02');
    expect(history.every((payment, index) => index === 0 || payment.date === addDays(history[index - 1].date, -7))).toBe(true);
    // The whole run from 1996 is more than a thousand dates and is all there.
    expect(occurrencesBetween(b, '1996-01-01', '2026-11-06').length).toBeGreaterThan(1500);
  });
  it('a range with no end stops at the limit and returns at once', () => {
    const b = bill({ frequency: 'weekly', dueDate: '2026-01-05' });
    const at = performance.now();
    const dates = occurrencesBetween(b, '2026-01-01', '9999-12-31');
    expect(dates).toHaveLength(10_000);
    expect(dates[0].date).toBe('2026-01-05');
    expect(performance.now() - at).toBeLessThan(1000);
  });
  it('no ordinary range comes near the limit: a year of weekly dates is 52 or 53', () => {
    const b = bill({ frequency: 'weekly', dueDate: '2000-01-03' });
    for (const year of [2024, 2025, 2026, 2027]) expect(occurrencesBetween(b, `${year}-01-01`, `${year}-12-31`).length).toBeLessThanOrEqual(53);
  });
});
