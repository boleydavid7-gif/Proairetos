// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { calendarLines, type CalendarLine, type HostContext, type Provider } from '../../core/providers';
import { eventsFromLines } from '../../app/providers/calendarView';
import { oikonomiaCalendar } from '../../oikonomia/providers/calendar';
import { philiaCalendar } from '../../philia/providers/calendar';
import { poreiaCalendar } from '../../poreia/providers/calendar';
import { therapeiaCalendar } from '../../therapeia/providers/calendar';
import { meleteCalendar } from '../../melete/providers/calendar';

/*
 * Dates, repeats and the clock: a date with no time stays that day in every time zone, a span ends the day after its last
 * day, a repeat is expanded only inside the range asked for, and a time that does not exist (spring forward) or happens
 * twice (fall back) still gives a line with the right length. Each case runs in several zones by changing TZ.
 */
const ZONES = ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'];
const original = process.env.TZ;
afterEach(() => { process.env.TZ = original; });

const day = '2026-01-01T09:00:00.000Z';
const at = (value: string) => new Date(value);
function ctx(records: Record<string, unknown[]>, from: string, until: string, today = from): HostContext {
  return {
    today,
    now: new Date(`${today}T12:00:00`),
    range: { from: at(`${from}T00:00:00`), until: at(`${until}T00:00:00`) },
    records: async <T,>(source: string) => (records[source] ?? []) as T[],
    setting: () => null,
    isUsable: () => true,
    enabled: () => true,
  } as HostContext;
}
const run = async (provider: Provider<'calendar'>, records: Record<string, unknown[]>, from: string, until: string, today?: string): Promise<CalendarLine[]> => {
  const out = await calendarLines([provider], APPS, ctx(records, from, until, today));
  expect(out.rejected).toEqual([]);
  return out.lines;
};
const person = (extra: Record<string, unknown>) => ({ id: 'p1', name: 'Mara', notes: [], gifts: [], times: [], createdAt: day, ...extra });

describe.each(ZONES)('dates with no time, in %s', (zone) => {
  it('a birthday, a one-time date and a trip are on the same calendar days in every zone, and a span ends the day after its last day', async () => {
    process.env.TZ = zone;
    const philia = await run(philiaCalendar, { 'local:philia:person:': [person({ birthday: '1984-11-08', dates: [{ id: 'd', label: 'Reunion', date: '2026-11-20', once: true }] })] }, '2026-11-01', '2026-12-01');
    expect(philia.map((line) => [line.title, line.day, line.until])).toEqual([['Mara’s birthday', '2026-11-08', undefined], ['Mara: Reunion', '2026-11-20', undefined]]);
    const trip = { id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', createdAt: day, updatedAt: day };
    const poreia = await run(poreiaCalendar, { 'local:poreia:trip:': [trip] }, '2026-11-01', '2026-12-01');
    expect(poreia.map((line) => [line.kind, line.day, line.until])).toEqual([['info', '2026-11-07', '2026-11-13']]);
    // As an all-day entry it covers 7 to 12 November and not the 13th, whatever the zone.
    const [entry] = eventsFromLines(poreia);
    expect(entry.allDay).toEqual({ from: '2026-11-07', until: '2026-11-13' });
    expect(entry.start.getDate()).toBe(7);
    expect(entry.end.getDate()).toBe(13);
  });
  it('a bill’s due dates are the same days, the end of a month is clamped, and nothing outside the range appears', async () => {
    process.env.TZ = zone;
    const bill = { id: 'b1', name: 'Rent', amountCents: 100, currency: 'USD', dueDate: '2026-01-31', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: day, updatedAt: day };
    const lines = await run(oikonomiaCalendar, { oikonomiaBills: [bill] }, '2026-02-01', '2026-06-01');
    expect(lines.map((line) => line.day)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    expect(lines.every((line) => line.kind === 'deadline' && line.until === undefined)).toBe(true);
  });
});

describe('repeats are expanded inside the range', () => {
  it('29 February comes round on the 28th in other years, and on the 29th in a leap year', async () => {
    const records = { 'local:philia:person:': [person({ birthday: '2000-02-29' })] };
    expect((await run(philiaCalendar, records, '2027-02-01', '2027-03-01')).map((line) => line.day)).toEqual(['2027-02-28']);
    expect((await run(philiaCalendar, records, '2028-02-01', '2028-03-01')).map((line) => line.day)).toEqual(['2028-02-29']);
  });
  it('a range across the new year finds a 1 January date once, and a year range finds each yearly date once', async () => {
    const records = { 'local:philia:person:': [person({ birthday: '01-01', dates: [{ id: 'a', label: 'Anniversary', date: '2015-12-30' }] })] };
    expect((await run(philiaCalendar, records, '2026-12-28', '2027-01-05')).map((line) => [line.title, line.day])).toEqual([['Mara: Anniversary', '2026-12-30'], ['Mara’s birthday', '2027-01-01']]);
    const year = await run(philiaCalendar, records, '2026-01-01', '2027-01-01');
    expect(year.map((line) => line.day)).toEqual(['2026-01-01', '2026-12-30']);
  });
  it('the same occurrence is a different line each time it comes round, with the day in its reference', async () => {
    const records = { 'local:philia:person:': [person({ dates: [{ id: 'a', label: 'Anniversary', date: '2015-11-09' }] })] };
    const lines = await run(philiaCalendar, records, '2026-11-01', '2028-01-01');
    expect(lines.map((line) => line.ref.occurrence)).toEqual(['2026-11-09', '2027-11-09']);
  });
  it('a weekly bill is expanded for the range asked for and not a day beyond it', async () => {
    const bill = { id: 'b1', name: 'Cleaner', amountCents: 100, currency: 'USD', dueDate: '2026-10-01', frequency: 'weekly', autopay: false, reminderDays: 3, payments: [], createdAt: day, updatedAt: day };
    const lines = await run(oikonomiaCalendar, { oikonomiaBills: [bill] }, '2026-11-01', '2026-11-15');
    expect(lines.map((line) => line.day)).toEqual(['2026-11-05', '2026-11-12']);
  });
  it('a bill with a payment recorded for a date is marked done on that date only', async () => {
    const bill = { id: 'b1', name: 'Rent', amountCents: 100, currency: 'USD', dueDate: '2026-10-08', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [{ id: 'p', date: '2026-11-08', amountCents: 100 }], createdAt: day, updatedAt: day };
    const lines = await run(oikonomiaCalendar, { oikonomiaBills: [bill] }, '2026-10-01', '2026-12-31', '2026-11-20');
    expect(lines.map((line) => [line.day, line.done])).toEqual([['2026-10-08', false], ['2026-11-08', true], ['2026-12-08', false]]);
  });
  // The expansion counts occurrences from the bill's first date and stops after 500 of them (core/bills.ts
  // `occurrencesBetween`, used before this change too), so a weekly bill first due more than about ten years ago shows
  // nothing in the range. It is a defect in code this slice did not change. The test is marked as a known failure so
  // the day it is fixed the run says so.
  it.fails('KNOWN DEFECT: a weekly bill first due more than ten years ago still has its dates in a range today', async () => {
    const bill = { id: 'b1', name: 'Cleaner', amountCents: 100, currency: 'USD', dueDate: '2015-01-05', frequency: 'weekly', autopay: false, reminderDays: 3, payments: [], createdAt: day, updatedAt: day };
    const lines = await run(oikonomiaCalendar, { oikonomiaBills: [bill] }, '2026-11-01', '2026-11-15');
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe.each(['America/Los_Angeles', 'Pacific/Auckland', 'UTC'])('timed entries across a clock change, in %s', (zone) => {
  // Spring forward and fall back for each zone, as local wall times.
  const changes: Record<string, { skipped?: string; repeated?: string }> = {
    'America/Los_Angeles': { skipped: '2026-03-08T02:30', repeated: '2026-11-01T01:30' },
    'Pacific/Auckland': { skipped: '2026-09-27T02:30', repeated: '2027-04-04T02:30' },
    UTC: {},
  };
  it('a visit in the hour that does not exist, or the hour that happens twice, is one hour long on the day it is set for', async () => {
    process.env.TZ = zone;
    for (const when of Object.values(changes[zone]).filter(Boolean) as string[]) {
      const dayOf = when.slice(0, 10);
      const next = new Date(`${dayOf}T12:00:00`);
      next.setDate(next.getDate() + 2);
      const until = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      const lines = await run(therapeiaCalendar, { 'local:therapeia:visit:': [{ id: 'v', with: 'Dr Lee', at: when, questions: [], createdAt: day }] }, dayOf, until);
      expect(lines, when).toHaveLength(1);
      const [line] = lines;
      expect(line.end!.getTime() - line.start!.getTime()).toBe(3_600_000);
      // The day is the day the visit was set for; a time that does not exist moves forward within it.
      expect(line.day).toBe(dayOf);
    }
  });
  it('a study session that runs across the change keeps its real length, and a session at midnight stays on its day', async () => {
    process.env.TZ = zone;
    const date = zone === 'Pacific/Auckland' ? '2026-09-27' : '2026-03-08';
    const session = { id: 's', subjectId: 'x', kind: 'read', start: `${date}T00:30:00`, minutes: 180 };
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + 2);
    const until = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    const lines = await run(meleteCalendar, { 'local:melete:session:': [session], 'local:melete:subject:': [{ id: 'x', name: 'Biology', dates: [], materials: [], createdAt: day }] }, date, until);
    expect(lines).toHaveLength(1);
    expect(lines[0].end!.getTime() - lines[0].start!.getTime()).toBe(180 * 60_000);
    expect(lines[0].day).toBe(date);
  });
});
