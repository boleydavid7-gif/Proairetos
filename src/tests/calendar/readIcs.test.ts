import { describe, expect, it } from 'vitest';
import { readIcs } from '../../core/calendar/readIcs';

// Shaped like Google's "secret address in iCal format" export.
const sample = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'BEGIN:VTIMEZONE',
  'TZID:America/New_York',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0400',
  'TZNAME:EDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'TZNAME:EST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:dentist@example',
  'DTSTART;TZID=America/New_York:20261005T093000',
  'DTEND;TZID=America/New_York:20261005T101500',
  'SUMMARY:Dentist\\, Dr. Lee',
  'LOCATION:Main St',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:class@example',
  'DTSTART;TZID=America/New_York:20261001T180000',
  'DTEND;TZID=America/New_York:20261001T193000',
  'RRULE:FREQ=WEEKLY;COUNT=10',
  'EXDATE;TZID=America/New_York:20261015T180000',
  'SUMMARY:Evening class',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:class@example',
  'RECURRENCE-ID;TZID=America/New_York:20261008T180000',
  'DTSTART;TZID=America/New_York:20261008T190000',
  'DTEND;TZID=America/New_York:20261008T203000',
  'SUMMARY:Evening class (moved)',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:holiday@example',
  'DTSTART;VALUE=DATE:20261012',
  'DTEND;VALUE=DATE:20261013',
  'SUMMARY:Day off',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:gone@example',
  'DTSTART:20261006T120000Z',
  'DTEND:20261006T130000Z',
  'STATUS:CANCELLED',
  'SUMMARY:Cancelled lunch',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const range = { start: new Date('2026-10-01T00:00:00Z'), end: new Date('2026-10-20T00:00:00Z') };

describe('reading another calendar', () => {
  const events = readIcs(sample, range);
  const titles = events.map((e) => e.title);

  it('reads one-off events with their time zone and text', () => {
    const dentist = events.find((e) => e.title === 'Dentist, Dr. Lee')!;
    expect(dentist.start.toISOString()).toBe('2026-10-05T13:30:00.000Z');
    expect(dentist.end.toISOString()).toBe('2026-10-05T14:15:00.000Z');
    expect(dentist.location).toBe('Main St');
  });

  it('expands repeats within the range, leaving out skipped dates and applying moved ones', () => {
    const classes = events.filter((e) => e.title.startsWith('Evening class'));
    expect(classes.map((e) => e.start.toISOString())).toEqual([
      '2026-10-01T22:00:00.000Z',
      '2026-10-08T23:00:00.000Z',
    ]);
    expect(titles).toContain('Evening class (moved)');
  });

  it('keeps all-day events as dates, and drops cancelled ones', () => {
    expect(events.find((e) => e.title === 'Day off')?.allDay).toEqual({ from: '2026-10-12', until: '2026-10-13' });
    expect(titles).not.toContain('Cancelled lunch');
  });
});
