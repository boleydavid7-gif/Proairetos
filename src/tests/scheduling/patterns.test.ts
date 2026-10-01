import { addDays, daysBetween, mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import {
  blocksOn,
  cycleLength,
  occurrencesBetween,
  occurrencesOnDay,
  occurrencesStartingOn,
  validatePattern,
} from '../../core/scheduling/patterns';
import { scheduleTemplates } from '../../core/scheduling/templates';
import type { ScheduleException, SchedulePattern } from '../../core/scheduling/types';

function fromTemplate(id: string, anchorDate: string, extra: Partial<SchedulePattern> = {}): SchedulePattern {
  const template = scheduleTemplates.find((t) => t.id === id)!;
  return {
    id,
    userId: 'u',
    name: template.name,
    kind: template.kind,
    layout: template.weekly ? 'WEEKLY' : 'CYCLE',
    anchorDate,
    segments: template.segments,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...extra,
  };
}

const hhmm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const describe24 = (date: Date) => `${toLocalDate(date)} ${hhmm(date)}`;

describe('the days, evenings, nights rotation from Tuesday 29 September 2026', () => {
  const rotation = fromTemplate('three-shift-rotation', '2026-09-29');
  const labelOn = (date: string) => blocksOn(rotation, date)[0]?.label ?? 'off';

  it('is a 28-day cycle', () => {
    expect(cycleLength(rotation.segments)).toBe(28);
  });

  it('places each run on the right dates', () => {
    expect(['2026-09-29', '2026-10-05'].map(labelOn)).toEqual(['Days', 'Days']);
    expect(labelOn('2026-10-06')).toBe('off');
    expect(['2026-10-07', '2026-10-13'].map(labelOn)).toEqual(['Evenings', 'Evenings']);
    expect(labelOn('2026-10-14')).toBe('off');
    expect(['2026-10-15', '2026-10-21'].map(labelOn)).toEqual(['Nights', 'Nights']);
    expect(['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'].map(labelOn)).toEqual(
      Array(5).fill('off'),
    );
  });

  it('starts over on a Tuesday, every 28 days, indefinitely', () => {
    expect(labelOn('2026-10-27')).toBe('Days');
    expect(new Date(2026, 9, 27).getDay()).toBe(2);
    expect(labelOn('2026-11-04')).toBe('Evenings'); // Wednesday of the second cycle
    expect(labelOn(addDays('2026-09-29', 28 * 13))).toBe('Days'); // a year on
  });

  it('runs night shifts past midnight and shows them on the morning they end', () => {
    const [night] = occurrencesStartingOn(rotation, '2026-10-21');
    expect(describe24(night.start)).toBe('2026-10-21 22:30');
    expect(describe24(night.end)).toBe('2026-10-22 06:30');

    // Thursday the 22nd is a day off, but the last night shift ends that morning.
    const thursday = occurrencesOnDay([rotation], [], '2026-10-22');
    expect(thursday.map((o) => [o.label, o.date])).toEqual([['Nights', '2026-10-21']]);
  });

  it('has nothing before it starts', () => {
    expect(blocksOn(rotation, '2026-09-28')).toEqual([]);
  });
});

describe('weekly patterns', () => {
  it('anchor on Monday and repeat by weekday', () => {
    const anchor = mondayOnOrBefore('2026-10-01');
    expect(anchor).toBe('2026-09-28');
    const weekly = fromTemplate('weekly', anchor);

    expect(blocksOn(weekly, '2026-10-02')).toHaveLength(1); // Friday
    expect(blocksOn(weekly, '2026-10-03')).toEqual([]); // Saturday
    expect(blocksOn(weekly, '2026-11-30')).toHaveLength(1); // a Monday weeks later
  });
});

describe('one-day changes', () => {
  const rotation = fromTemplate('three-shift-rotation', '2026-09-29');
  const change = (date: string, blocks: ScheduleException['blocks']): ScheduleException => ({
    id: date,
    userId: 'u',
    patternId: rotation.id,
    date,
    blocks,
    createdAt: '2026-09-01',
  });

  it('can cancel a day or replace its hours, and marks the result as changed', () => {
    const exceptions = [change('2026-10-01', []), change('2026-10-02', [{ start: '08:00', end: '12:00' }])];

    expect(occurrencesStartingOn(rotation, '2026-10-01', exceptions)).toEqual([]);
    const [swapped] = occurrencesStartingOn(rotation, '2026-10-02', exceptions);
    expect([hhmm(swapped.start), hhmm(swapped.end), swapped.changed]).toEqual(['08:00', '12:00', true]);
    expect(occurrencesStartingOn(rotation, '2026-10-03', exceptions)[0].changed).toBe(false);
  });

  it('can add hours on a day off', () => {
    const exceptions = [change('2026-10-06', [{ start: '06:30', end: '14:30', label: 'Overtime' }])];
    expect(occurrencesStartingOn(rotation, '2026-10-06', exceptions)[0].label).toBe('Overtime');
  });
});

describe('ranges and edges', () => {
  it('returns occurrences from several patterns in time order', () => {
    const work = fromTemplate('four-on-four-off', '2026-10-01');
    const walk = fromTemplate('protected', mondayOnOrBefore('2026-10-01'), { id: 'walk', name: 'Walk' });
    const results = occurrencesBetween([walk, work], [], new Date(2026, 9, 1), new Date(2026, 9, 2));
    expect(results.map((o) => o.patternName)).toEqual(['4 on, 4 off', 'Walk']);
  });

  it('respects an end date', () => {
    const ending = fromTemplate('four-on-four-off', '2026-10-01', { endDate: '2026-10-02' });
    expect(blocksOn(ending, '2026-10-02')).toHaveLength(1);
    expect(blocksOn(ending, '2026-10-09')).toEqual([]);
  });

  it('counts calendar days correctly across daylight saving changes', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('explains what is wrong with an unusable pattern', () => {
    const problems = validatePattern({
      name: ' ',
      anchorDate: '2026-02-30',
      segments: [{ days: 0, blocks: [{ start: '25:00', end: '06:00' }] }, { days: 3, blocks: [{ start: '09:00', end: '09:00' }] }],
    });
    expect(problems).toEqual([
      'Give the schedule a name.',
      'Choose the date the cycle starts.',
      'Run 1: choose between 1 and 366 days.',
      'Run 1: check the times.',
      'Run 2: start and end are the same time.',
    ]);
    expect(validatePattern(fromTemplate('three-shift-rotation', '2026-09-29'))).toEqual([]);
  });

  it('every template is valid', () => {
    for (const template of scheduleTemplates) {
      expect(validatePattern(fromTemplate(template.id, '2026-09-28'))).toEqual([]);
    }
  });
});
