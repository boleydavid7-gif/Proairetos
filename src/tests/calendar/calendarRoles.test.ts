import { beforeEach, describe, expect, it } from 'vitest';
import { otherCalendars } from '../../app/calendars/otherCalendars';
import { closingFrom, dayRange, personalDate } from '../../core/rhythm/personalDay';
import { deliverAt, defaultQuietHours } from '../../core/rhythm/quietHours';

function fakeStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
}

const iso = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

function seed() {
  localStorage.setItem(
    'proairetos.otherCalendars',
    JSON.stringify([
      { id: 'work', name: 'Work', shown: true, role: 'commitment' },
      { id: 'family', name: 'Family', shown: true },
      { id: 'rest', name: 'Rest', shown: true, role: 'protected' },
      { id: 'hidden', name: 'Hidden', shown: false, role: 'commitment' },
    ]),
  );
  const event = (key: string, title: string, start: string, end: string, allDay?: object) => ({ key, title, start, end, ...(allDay ? { allDay } : {}) });
  localStorage.setItem('proairetos.otherCalendars.work', JSON.stringify([event('w1', 'Late shift', iso(2026, 10, 1, 22), iso(2026, 10, 2, 6))]));
  localStorage.setItem('proairetos.otherCalendars.family', JSON.stringify([event('f1', 'Dinner', iso(2026, 10, 1, 18), iso(2026, 10, 1, 20))]));
  localStorage.setItem(
    'proairetos.otherCalendars.rest',
    JSON.stringify([
      event('r1', 'Nap', iso(2026, 10, 2, 13), iso(2026, 10, 2, 16)),
      event('r2', 'Holiday', iso(2026, 10, 3, 0), iso(2026, 10, 4, 0), { from: '2026-10-03', until: '2026-10-04' }),
    ]),
  );
  localStorage.setItem('proairetos.otherCalendars.hidden', JSON.stringify([event('h1', 'Old job', iso(2026, 10, 1, 9), iso(2026, 10, 1, 17))]));
}

describe('other calendars that count', () => {
  beforeEach(() => {
    fakeStorage();
    seed();
  });

  it('turns only chosen, shown, timed events into blocks of the right kind', () => {
    const blocks = otherCalendars.blocksBetween(new Date(2026, 9, 1), new Date(2026, 9, 5));
    expect(blocks.map((b) => [b.label, b.kind])).toEqual([
      ['Late shift', 'COMMITTED'],
      ['Nap', 'PROTECTED'],
    ]);
  });

  it('lets a late work event carry the day, and holds reminders during protected time', () => {
    const blocks = otherCalendars.blocksBetween(new Date(2026, 9, 1), new Date(2026, 9, 5));
    const follow = { startHour: 0, followShifts: true };
    expect(personalDate(new Date(2026, 9, 2, 3), blocks, follow)).toBe('2026-10-01');
    expect(closingFrom(dayRange('2026-10-01', blocks, follow), blocks)).toEqual(new Date(2026, 9, 2, 6));
    expect(deliverAt(new Date(2026, 9, 2, 14), defaultQuietHours, blocks)).toEqual(new Date(2026, 9, 2, 16));
  });

  it('dismisses one imported event locally and can undo that dismissal', async () => {
    const before = otherCalendars.eventsBetween(new Date(2026, 9, 1), new Date(2026, 9, 5));
    expect(before.map((event) => event.key)).toContain('f1');

    const deletion = otherCalendars.removeEvent('family', 'f1');
    expect(otherCalendars.eventsBetween(new Date(2026, 9, 1), new Date(2026, 9, 5)).map((event) => event.key)).not.toContain('f1');

    await deletion.undo();
    expect(otherCalendars.eventsBetween(new Date(2026, 9, 1), new Date(2026, 9, 5)).map((event) => event.key)).toContain('f1');
  });
});
