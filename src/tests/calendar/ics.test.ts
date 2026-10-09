import { describe, expect, it } from 'vitest';
import { feedEvents, defaultFeedOptions } from '../../core/calendar/feedEvents';
import { buildIcs, escapeText, foldLine } from '../../core/calendar/ics';
import type { LifeItem } from '../../core/life-items/types';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const now = new Date(Date.UTC(2026, 9, 1, 12, 0, 0));
const night: ScheduleOccurrence = {
  patternId: 'p1',
  patternName: 'Hospital',
  kind: 'COMMITTED',
  label: 'Nights',
  date: '2026-10-17',
  start: new Date(Date.UTC(2026, 9, 18, 2, 30)),
  end: new Date(Date.UTC(2026, 9, 18, 10, 30)),
  changed: false,
};
const item = (fields: Partial<LifeItem>): LifeItem => ({
  id: 'i1', userId: 'u', type: 'DO', title: 'Call family', status: 'OPEN', important: false, source: 'MANUAL', carried: false,
  createdAt: now.toISOString(), updatedAt: now.toISOString(), ...fields,
});

describe('calendar file', () => {
  it('escapes each special character with exactly one backslash', () => {
    expect(escapeText('a;b')).toBe('a' + String.fromCharCode(92) + ';b');
  });

  it('writes timed and all-day events in UTC with CRLF lines', () => {
    const ics = buildIcs(
      [
        { uid: 'a', title: 'Work', start: night.start, end: night.end },
        { uid: 'b', title: 'Laundry', date: '2026-10-31' },
      ],
      { name: 'Proairetos', now },
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261018T023000Z\r\nDTEND:20261018T103000Z');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101');
    expect(ics).toContain('UID:a@proairetos');
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });

  it('escapes text and folds long lines without breaking characters', () => {
    expect(escapeText('Pick up milk, eggs; then\nhome')).toBe('Pick up milk\\, eggs\\; then\\nhome');
    const long = `SUMMARY:${'é'.repeat(60)}`;
    const folded = foldLine(long);
    expect(folded.split('\r\n ').join('')).toBe(long);
    expect(folded.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });
});

describe('what goes in the feed', () => {
  it('shares commitments as plain "Busy" by default, and nothing else', () => {
    const events = feedEvents([night, { ...night, kind: 'PROTECTED', patternId: 'p2' }], [item({ plannedFor: '2026-10-02' })], defaultFeedOptions);
    expect(events.map((e) => e.title)).toEqual(['Busy']);
  });

  it('adds labels, protected time, and dated items only when chosen', () => {
    const events = feedEvents(
      [night, { ...night, kind: 'PROTECTED', patternId: 'p2' }],
      [item({ plannedFor: '2026-10-02' }), item({ id: 'i2', title: 'Dentist', scheduledAt: night.start.toISOString() }), item({ id: 'i3', status: 'DONE', plannedFor: '2026-10-02' })],
      { shifts: true, shiftLabels: true, protectedTime: true, tasks: true },
    );
    expect(events.map((e) => e.title)).toEqual(['Nights', 'Protected time', 'Call family', 'Dentist']);
    expect(events[2]).toMatchObject({ date: '2026-10-02' });
  });
});

describe('subscribe links', () => {
  it('builds Apple, Google, and Outlook links from the feed address', async () => {
    const { subscribeLinks } = await import('../../features/settings/CalendarSection');
    const links = subscribeLinks('https://x.supabase.co/functions/v1/calendar-feed?token=abc');
    expect(links.apple).toBe('webcal://x.supabase.co/functions/v1/calendar-feed?token=abc');
    expect(links.google).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent('webcal://x.supabase.co/functions/v1/calendar-feed?token=abc')}`);
    expect(links.outlook).toContain(`url=${encodeURIComponent('https://x.supabase.co/functions/v1/calendar-feed?token=abc')}`);
  });
});

describe('one event with a place and a note', () => {
  it('carries them when there are some, and nothing extra when there are not', () => {
    const now = new Date('2026-10-09T10:00:00Z');
    const withBoth = buildIcs(
      [{ uid: 'x', title: 'Dentist', start: new Date('2026-10-12T15:00:00Z'), end: new Date('2026-10-12T15:45:00Z'), location: 'Main St, Suite 4', notes: 'Bring the form' }],
      { name: 'Dentist', now },
    );
    expect(withBoth).toContain('LOCATION:Main St\\, Suite 4');
    expect(withBoth).toContain('DESCRIPTION:Bring the form');
    const plain = buildIcs([{ uid: 'y', title: 'Walk', date: '2026-10-12' }], { name: 'Walk', now });
    expect(plain).not.toContain('LOCATION');
    expect(plain).not.toContain('DESCRIPTION');
  });
});
