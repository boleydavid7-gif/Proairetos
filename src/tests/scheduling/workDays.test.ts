import { describe, expect, it } from 'vitest';
import { workDates } from '../../core/scheduling/workDays';

const block = (date: string, start: string, end: string, kind: 'COMMITTED' | 'PROTECTED' = 'COMMITTED') => ({ kind, date, start: new Date(start), end: new Date(end) });

describe('work dates', () => {
  it('counts committed blocks of four hours or more on the day they begin', () => {
    const dates = workDates([
      block('2026-10-12', '2026-10-12T07:00', '2026-10-12T19:00'),
      block('2026-10-14', '2026-10-14T19:00', '2026-10-15T07:00'),
      block('2026-10-16', '2026-10-16T09:00', '2026-10-16T11:00'),
      block('2026-10-17', '2026-10-17T08:00', '2026-10-17T16:00', 'PROTECTED'),
    ]);
    expect([...dates]).toEqual(['2026-10-12', '2026-10-14']);
  });
});
