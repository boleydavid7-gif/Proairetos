import { describe, expect, it } from 'vitest';
import { entryLook, setDaysAheadOpening, takeDaysAheadOpening } from '../../features/days/daysAhead';
import type { SchedulePattern, ScheduleOccurrence } from '../../core/scheduling/types';

const occurrence = (kind: 'COMMITTED' | 'PROTECTED'): ScheduleOccurrence => ({
  patternId: 'p', patternName: 'Work', kind, label: 'Days', date: '2026-10-02',
  start: new Date('2026-10-02T06:30:00'), end: new Date('2026-10-02T14:30:00'), changed: false,
});
const shift = (kind: 'COMMITTED' | 'PROTECTED') => ({ kind: 'shift' as const, key: 'k', start: new Date(), end: new Date(), occurrence: occurrence(kind) });

describe('days ahead', () => {
  it('uses the colour and place the person chose, else a quiet default by kind', () => {
    const pattern = { id: 'p', color: 'rose', location: 'Middletown Works' } as SchedulePattern;
    expect(entryLook(shift('COMMITTED'), [pattern], [])).toMatchObject({ title: 'Work · Days', color: 'rose', icon: 'work', location: 'Middletown Works' });
    expect(entryLook(shift('COMMITTED'), [], [])).toMatchObject({ color: 'amber' });
    expect(entryLook(shift('PROTECTED'), [], [])).toMatchObject({ color: 'sage', icon: 'protected' });
  });

  it('hands where to open to the page once', () => {
    setDaysAheadOpening({ start: '2026-10-02', focusKey: 'x' });
    expect(takeDaysAheadOpening()).toEqual({ start: '2026-10-02', focusKey: 'x' });
    expect(takeDaysAheadOpening()).toEqual({});
  });
});
