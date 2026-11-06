import { describe, expect, it } from 'vitest';
import { buildIcs } from '../../core/calendar/ics';
import { feedLines, type FeedOptions } from '../../core/calendar/feedEvents';
import type { CalendarLine } from '../../core/providers';

/*
 * The calendar file takes Poreia and Oikonomia only through their calendar lines, for the categories switched on. These
 * hold the file to what the lines can carry: no amount, code, note, address or route, whatever is switched on.
 */
const off: Pick<FeedOptions, 'bills' | 'trips' | 'tripTimes'> = { bills: false, trips: false, tripTimes: false };
const lines: CalendarLine[] = [
  { ref: { app: 'oikonomia', kind: 'bill', id: 'b1', occurrence: '2026-11-07' }, kind: 'deadline', title: 'Internet', open: '/oikonomia/?open=bill:b1', day: '2026-11-07', done: true, color: 'amber' },
  { ref: { app: 'poreia', kind: 'trip', id: 'tr1' }, kind: 'info', title: 'Lisbon', open: '/poreia/?open=trip%3Atr1', day: '2026-11-07', until: '2026-11-13', location: 'Lisbon' },
  { ref: { app: 'poreia', kind: 'off', id: 'o1' }, kind: 'info', title: 'Time off', open: '/poreia/?open=time', day: '2026-11-16', until: '2026-11-18', location: 'CANARY-PLACE' },
  { ref: { app: 'poreia', kind: 'booking', id: 'b1' }, kind: 'event', title: 'Flight: TP 123', open: '/poreia/?open=booked%3Ab1', day: '2026-11-07', start: new Date('2026-11-07T08:15:00'), end: new Date('2026-11-07T10:30:00'), location: 'CANARY-ROUTE JFK → LIS' },
  { ref: { app: 'poreia', kind: 'plan', id: 'p1' }, kind: 'event', title: 'Tram 28', open: '/poreia/?open=plan%3Ap1', day: '2026-11-07', start: new Date('2026-11-07T09:00:00'), end: new Date('2026-11-07T10:00:00'), location: 'CANARY-WHERE' },
  { ref: { app: 'philia', kind: 'birthday', id: 'p', occurrence: '2026-11-08' }, kind: 'recurring', title: 'Mara’s birthday', open: '/philia/?open=person%3Ap', day: '2026-11-08' },
];
const ics = (options: Partial<typeof off>) => buildIcs(feedLines(lines, { ...off, ...options }), { name: 'Proairetos', now: new Date('2026-11-05T12:00:00Z') });

describe('the calendar file takes only the categories switched on', () => {
  it('holds nothing with every category off', () => {
    expect(feedLines(lines, off)).toEqual([]);
  });
  it('bills: the name and the date, no amount, and no paid state', () => {
    const text = ics({ bills: true });
    expect(text).toContain('SUMMARY:Internet');
    expect(text).toMatch(/DTSTART;VALUE=DATE:20261107/);
    expect(text).not.toMatch(/Lisbon|Flight|Tram|Time off|birthday|\$|paid/i);
  });
  it('trips: names, dates and the trip’s place name, and time off as days, and no other place', () => {
    const text = ics({ trips: true });
    expect(text).toContain('SUMMARY:Lisbon');
    expect(text).toContain('LOCATION:Lisbon');
    expect(text).toContain('SUMMARY:Time off');
    expect(text).toMatch(/DTEND;VALUE=DATE:20261113/);
    expect(text).not.toMatch(/CANARY|Flight|Tram|Internet/);
  });
  it('bookings and plans with a time: the title and the time, no place of any kind', () => {
    const text = ics({ tripTimes: true });
    expect(text).toContain('SUMMARY:Flight: TP 123');
    expect(text).toContain('SUMMARY:Tram 28');
    expect(text).not.toMatch(/LOCATION|DESCRIPTION|CANARY|Lisbon|Internet/);
  });
  it('another app’s lines never go in, even with everything on', () => {
    const text = ics({ bills: true, trips: true, tripTimes: true });
    expect(text).not.toMatch(/birthday|Mara|CANARY|DESCRIPTION|\$/);
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(5);
  });
  it('each event has its own stable identity', () => {
    const uids = feedLines(lines, { bills: true, trips: true, tripTimes: true }).map((event) => event.uid);
    expect(new Set(uids).size).toBe(uids.length);
    expect(uids).toContain('oikonomia-bill-b1-2026-11-07');
  });
});
