import type { LifeItem } from '../../core/life-items/types';
import { occurrencesBetween } from '../../core/scheduling/patterns';
import { scheduleTemplates } from '../../core/scheduling/templates';
import type { SchedulePattern } from '../../core/scheduling/types';
import { buildDayTimeline, dayTitle, formatDuration, nowStatus } from '../../features/today/timeline';

const rotation: SchedulePattern = {
  id: 'work',
  userId: 'u',
  name: 'Work',
  kind: 'COMMITTED',
  layout: 'CYCLE',
  anchorDate: '2026-09-29',
  segments: scheduleTemplates.find((t) => t.id === 'three-shift-rotation')!.segments,
  createdAt: '',
  updatedAt: '',
};

const item = (title: string, scheduledAt: Date, status: LifeItem['status'] = 'OPEN'): LifeItem => ({
  id: title,
  userId: 'u',
  type: 'DO',
  title,
  status,
  important: false,
  source: 'MANUAL',
  carried: false,
  scheduledAt: scheduledAt.toISOString(),
  createdAt: '',
  updatedAt: '',
});

const occurrencesFor = (from: Date, to: Date) => occurrencesBetween([rotation], [], from, to);

describe('day timeline', () => {
  it('orders shifts and scheduled items by time', () => {
    const date = '2026-10-01'; // a Days shift
    const items = [item('Dentist', new Date(2026, 9, 1, 16)), item('Done already', new Date(2026, 9, 1, 8), 'DONE')];
    const entries = buildDayTimeline(date, occurrencesFor(new Date(2026, 9, 1), new Date(2026, 9, 2)), items, [rotation]);

    expect(entries.map((e) => (e.kind === 'item' ? e.item.title : e.kind))).toEqual(['shift', 'Dentist']);
  });

  it('shows the morning end of a night shift on a day off, and marks the day off', () => {
    const date = '2026-10-22';
    const entries = buildDayTimeline(date, occurrencesFor(new Date(2026, 9, 22), new Date(2026, 9, 23)), [], [rotation]);

    expect(entries.map((e) => e.kind)).toEqual(['off', 'shift']);
    const shift = entries[1];
    expect(shift.kind === 'shift' && shift.occurrence.label).toBe('Nights');
  });

  it('does not mark a day off before the schedule begins', () => {
    expect(buildDayTimeline('2026-09-01', [], [], [rotation])).toEqual([]);
  });
});

describe('now status', () => {
  it('knows when a shift is under way and what comes next', () => {
    const now = new Date(2026, 9, 1, 10, 0); // during a 6:30–14:30 Days shift
    const occurrences = occurrencesFor(new Date(2026, 9, 1), new Date(2026, 9, 3));
    const status = nowStatus(now, occurrences, [item('Pharmacy', new Date(2026, 9, 1, 15))]);

    expect(status.current?.label).toBe('Days');
    expect(status.next?.title).toBe('Pharmacy');
  });

  it('points to the next shift when nothing is scheduled sooner', () => {
    const now = new Date(2026, 9, 6, 12, 0); // the day off between Days and Evenings
    const status = nowStatus(now, occurrencesFor(now, new Date(2026, 9, 8)), []);

    expect(status.current).toBeUndefined();
    expect(status.next?.title).toBe('Work · Evenings');
    expect(status.next?.start).toEqual(new Date(2026, 9, 7, 14, 30));
  });
});

describe('wording', () => {
  it('formats durations plainly', () => {
    expect(formatDuration(20_000)).toBe('1 min');
    expect(formatDuration(40 * 60_000)).toBe('40 min');
    expect(formatDuration(130 * 60_000)).toBe('2 h 10 min');
    expect(formatDuration(3 * 60 * 60_000)).toBe('3 h');
    expect(formatDuration(50 * 60 * 60_000)).toBe('2 days');
  });

  it('names nearby days', () => {
    expect(dayTitle('2026-10-01', '2026-10-01')).toBe('Today');
    expect(dayTitle('2026-10-02', '2026-10-01')).toBe('Tomorrow');
    expect(dayTitle('2026-09-30', '2026-10-01')).toBe('Yesterday');
  });
});
