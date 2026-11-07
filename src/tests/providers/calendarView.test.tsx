// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { APPS } from '../../core/apps';
import { calendarLines, type CalendarLine, type HostContext, type Provider } from '../../core/providers';
import { eventsFromLines, isAppOwned, quietLinesByDay, quietWord } from '../../app/providers/calendarView';
import type { CalendarEvent } from '../../app/calendars/otherCalendars';
import AllDayRow from '../../features/days/AllDayRow';
import DayTimeline from '../../features/today/DayTimeline';
import type { TimelineEntry } from '../../features/today/timeline';

/*
 * What the calendar's screens do with the apps' lines: an entry an app owns carries where it opens and is never offered a
 * Delete; an imported calendar's event has no owner and keeps its Delete. The deadline and date words, and where every
 * kind of entry opens.
 */
afterEach(cleanup);

const line = (extra: Partial<CalendarLine>): CalendarLine => ({ ref: { app: 'philia', kind: 'birthday', id: 'p1' }, kind: 'recurring', title: 'Mara’s birthday', open: '/philia/?open=person%3Ap1', day: '2026-11-08', ...extra });
const at = (value: string) => new Date(value);

describe('who owns an entry', () => {
  it('an entry an app owns carries where it opens, from the line; an imported calendar’s event has no owner', () => {
    const [span, timed] = eventsFromLines([
      line({ ref: { app: 'therapeia', kind: 'visit', id: 'v1' }, kind: 'event', title: 'Dr Lee', open: '/therapeia/?open=visit%3Av1', day: '2026-11-05', start: at('2026-11-05T15:00:00'), end: at('2026-11-05T16:00:00') }),
      line({ ref: { app: 'poreia', kind: 'trip', id: 'tr1' }, kind: 'info', title: 'Lisbon', open: '/poreia/?open=trip%3Atr1', day: '2026-11-07', until: '2026-11-13' }),
    ]);
    // Trips and bookings are drawn before visits, as the screens always did.
    expect([span.open, timed.open]).toEqual(['/poreia/?open=trip%3Atr1', '/therapeia/?open=visit%3Av1']);
    expect(isAppOwned(timed) && isAppOwned(span)).toBe(true);
    const imported: CalendarEvent = { key: 'g1', title: 'Dentist', start: at('2026-11-05T09:00:00'), end: at('2026-11-05T10:00:00'), source: 'Google', sourceId: 'cal-1' };
    expect(isAppOwned(imported)).toBe(false);
  });
});

describe('the word after a deadline or a date', () => {
  it('says Due on a deadline not met, Every year on a date that comes round, and nothing where it would repeat itself', () => {
    expect(quietWord({ kind: 'deadline', title: 'Internet' })).toBe('Due');
    expect(quietWord({ kind: 'deadline', title: 'Clean the filter · Dishwasher' })).toBe('Due');
    expect(quietWord({ kind: 'deadline', title: 'Dishwasher: warranty ends' })).toBeUndefined();
    expect(quietWord({ kind: 'deadline', title: 'Passport: ends' })).toBeUndefined();
    expect(quietWord({ kind: 'deadline', title: 'Biology: Due' })).toBeUndefined();
    expect(quietWord({ kind: 'deadline', title: 'Rent', done: true })).toBeUndefined();
    expect(quietWord({ kind: 'recurring', title: 'Mara’s birthday' })).toBe('Every year');
    expect(quietWord({ kind: 'info', title: 'Tomas: Reunion' })).toBeUndefined();
  });
  it('a paid bill says Paid, not Due, and every line keeps its kind and its address', () => {
    const lines = quietLinesByDay([
      line({ ref: { app: 'oikonomia', kind: 'bill', id: 'b1', occurrence: '2026-11-08' }, kind: 'deadline', title: 'Rent', open: '/oikonomia/?open=bill:b1', done: true }),
      line({ ref: { app: 'oikonomia', kind: 'bill', id: 'b2', occurrence: '2026-11-08' }, kind: 'deadline', title: 'Internet', open: '/oikonomia/?open=bill:b2' }),
      line({}),
    ]).get('2026-11-08')!;
    expect(lines.map((each) => [each.name, each.kind, each.word, each.paid, each.href])).toEqual([
      ['Rent', 'deadline', undefined, true, '/oikonomia/?open=bill:b1'],
      ['Internet', 'deadline', 'Due', undefined, '/oikonomia/?open=bill:b2'],
      ['Mara’s birthday', 'recurring', 'Every year', undefined, '/philia/?open=person%3Ap1'],
    ]);
  });
});

describe('Today’s timeline', () => {
  const noop = () => undefined;
  const owned: CalendarEvent = { key: 'e1', title: 'Dr Lee', start: at('2026-11-05T15:00:00'), end: at('2026-11-05T16:00:00'), source: 'Therapeia', sourceId: 'therapeia', open: '/therapeia/?open=visit%3Av1' };
  const imported: CalendarEvent = { key: 'g1', title: 'Dentist', start: at('2026-11-05T17:00:00'), end: at('2026-11-05T18:00:00'), source: 'Google', sourceId: 'cal-1' };
  const entries: TimelineEntry[] = [
    { kind: 'event', key: 'e1', start: owned.start, end: owned.end, event: owned },
    { kind: 'event', key: 'g1', start: imported.start, end: imported.end, event: imported },
    { kind: 'allday', key: 'a1', event: { key: 'a1', title: 'Lisbon', start: at('2026-11-05T00:00:00'), end: at('2026-11-06T00:00:00'), allDay: { from: '2026-11-05', until: '2026-11-06' }, source: 'Poreia', sourceId: 'poreia', open: '/poreia/?open=trip%3Atr1' } },
  ];
  it('an entry an app owns is a link to its record, the whole row, and an imported event is not', () => {
    render(<DayTimeline date="2026-11-05" entries={entries} onChangeDay={noop} onOpenItem={noop} onOpenEntry={noop} />);
    const visit = screen.getByText('Dr Lee').closest('a');
    expect(visit?.getAttribute('href')).toBe('/therapeia/?open=visit%3Av1');
    expect(visit?.textContent).toContain('3:00');
    expect(screen.getByText('Dentist').closest('a')).toBeNull();
    expect(screen.getByText(/All day · Lisbon/).closest('a')?.getAttribute('href')).toBe('/poreia/?open=trip%3Atr1');
  });
});

describe('Delete on a day’s all-day entries and rows', () => {
  it('an all-day span an app owns is a link with no Delete; an imported one keeps its Delete', () => {
    const span = { key: 'a1', title: 'Lisbon', start: at('2026-11-07T00:00:00'), end: at('2026-11-13T00:00:00'), allDay: { from: '2026-11-07', until: '2026-11-13' }, source: 'Poreia', sourceId: 'poreia', open: '/poreia/?open=trip%3Atr1' };
    const { unmount } = render(<ul><AllDayRow event={span} busy={false} onRemove={() => undefined} /></ul>);
    expect(screen.getByText(/All day · Lisbon/).closest('a')?.getAttribute('href')).toBe('/poreia/?open=trip%3Atr1');
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    const removed = vi.fn();
    const foreign: CalendarEvent = { key: span.key, title: span.title, start: span.start, end: span.end, allDay: span.allDay, source: 'Google', sourceId: 'cal-1' };
    render(<ul><AllDayRow event={foreign} busy={false} onRemove={removed} /></ul>);
    screen.getByRole('button', { name: 'Delete Lisbon' }).click();
    expect(removed).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a')).toBeNull();
  });
});

describe('where every kind of entry opens', () => {
  const day = '2026-01-01T09:00:00.000Z';
  const range = { from: new Date('2026-11-01T00:00:00'), until: new Date('2026-12-01T00:00:00') };
  const ctx = (records: Record<string, unknown[]>): HostContext => ({ today: '2026-11-05', now: new Date('2026-11-05T12:00:00'), range, records: async <T,>(source: string) => (records[source] ?? []) as T[], setting: () => null, isUsable: () => true, enabled: () => true }) as HostContext;
  const opens = async (provider: Provider<'calendar'>, records: Record<string, unknown[]>) => {
    const out = await calendarLines([provider], APPS, ctx(records));
    expect(out.rejected).toEqual([]);
    return out.lines.map((each) => [each.ref.kind, each.open]);
  };
  it('each app’s lines open the exact record in its app', async () => {
    const [{ philiaCalendar }, { therapeiaCalendar }, { meleteCalendar }, { poreiaCalendar }, { oikonomiaCalendar }, { ktemaCalendar }] = await Promise.all([
      import('../../philia/providers/calendar'), import('../../therapeia/providers/calendar'), import('../../melete/providers/calendar'),
      import('../../poreia/providers/calendar'), import('../../oikonomia/providers/calendar'), import('../../ktema/providers/calendar'),
    ]);
    expect(await opens(philiaCalendar, { 'local:philia:person:': [{ id: 'p1', name: 'Mara', birthday: '11-08', dates: [{ id: 'd1', label: 'Dinner', date: '2026-11-06', once: true, time: '19:00' }, { id: 'd2', label: 'Anniversary', date: '2015-11-09' }, { id: 'd3', label: 'Reunion', date: '2026-11-20', once: true }], notes: [], gifts: [], times: [], createdAt: day }] })).toEqual([
      ['event', '/philia/?open=person%3Ap1'], ['birthday', '/philia/?open=person%3Ap1'], ['date', '/philia/?open=person%3Ap1'], ['date', '/philia/?open=person%3Ap1'],
    ]);
    expect(await opens(therapeiaCalendar, { 'local:therapeia:visit:': [{ id: 'v1', with: 'Dr Lee', at: '2026-11-05T15:00', questions: [], createdAt: day }] })).toEqual([['visit', '/therapeia/?open=visit%3Av1']]);
    expect(await opens(meleteCalendar, { 'local:melete:subject:': [{ id: 's1', name: 'Biology', dates: [{ id: 'd1', title: 'Midterm', date: '2026-11-08', kind: 'exam' }], materials: [], createdAt: day }], 'local:melete:session:': [{ id: 'ss1', subjectId: 's1', kind: 'read', start: '2026-11-05T15:00:00', minutes: 30 }] })).toEqual([['session', '/melete/?open=session:ss1'], ['date', '/melete/?open=subject:s1']]);
    expect(await opens(poreiaCalendar, { 'local:poreia:trip:': [{ id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, start: '2026-11-07', end: '2026-11-12', travelers: 1, stage: 'booked', createdAt: day, updatedAt: day }], 'local:poreia:booking:': [{ id: 'b1', tripId: 'tr1', kind: 'flight', title: 'TP 123', startDate: '2026-11-07', startTime: '08:15', endTime: '10:30', createdAt: day, updatedAt: day }], 'local:poreia:plan:': [{ id: 'pn1', tripId: 'tr1', date: '2026-11-07', time: '09:00', title: 'Tram 28', createdAt: day, updatedAt: day }], 'local:poreia:off:': [{ id: 'o1', title: 'x', start: '2026-11-16', end: '2026-11-17', status: 'approved', hours: 16, createdAt: day, updatedAt: day }] })).toEqual([
      ['trip', '/poreia/?open=trip%3Atr1'], ['off', '/poreia/?open=time'], ['booking', '/poreia/?open=booked%3Ab1'], ['plan', '/poreia/?open=plan%3Apn1'],
    ]);
    expect(await opens(oikonomiaCalendar, { oikonomiaBills: [{ id: 'b1', name: 'Internet', amountCents: 5000, currency: 'USD', dueDate: '2026-11-07', frequency: 'once', autopay: false, reminderDays: 3, payments: [], createdAt: day, updatedAt: day }] })).toEqual([['bill', '/oikonomia/?open=bill:b1']]);
    expect(await opens(ktemaCalendar, { 'local:ktema:thing:': [{ id: 't1', name: 'Dishwasher', category: 'Appliance', warrantyUntil: '2026-11-20', createdAt: day }], 'local:ktema:upkeep:': [{ id: 'u1', thingId: 't1', name: 'Clean the filter', every: { count: 1, unit: 'months' }, start: '2026-11-12', history: [], createdAt: day }] })).toEqual([['end', '/ktema/?open=thing%3At1'], ['upkeep', '/ktema/?open=upkeep%3Au1']]);
  });
});
