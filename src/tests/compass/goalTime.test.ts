import { describe, expect, it } from 'vitest';
import { goalSchedule, readWeekly } from '../../core/compass/goalTime';
import { occurrencesBetween } from '../../core/scheduling/patterns';
import type { SchedulePattern } from '../../core/scheduling/types';

describe('time for a goal', () => {
  it('makes a weekly protected-time schedule that reads back the same', () => {
    const input = goalSchedule({ body: 'Learn guitar', color: 'violet' }, { days: [1, 3], start: '19:00', end: '20:00' }, '2026-10-02');
    expect(input).toMatchObject({ name: 'Learn guitar', kind: 'PROTECTED', layout: 'WEEKLY', anchorDate: '2026-09-28', color: 'violet' });
    const pattern = { ...input, id: 'p', userId: 'u', createdAt: '', updatedAt: '' } as SchedulePattern;
    expect(readWeekly(pattern)).toEqual({ days: [1, 3], start: '19:00', end: '20:00' });
    const blocks = occurrencesBetween([pattern], [], new Date('2026-10-05T00:00:00'), new Date('2026-10-12T00:00:00'));
    expect(blocks.map((b) => b.date)).toEqual(['2026-10-06', '2026-10-08']);
  });
});
