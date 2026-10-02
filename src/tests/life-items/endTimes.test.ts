import { describe, expect, it } from 'vitest';
import { completeRoutine, scheduleItem, setEnd } from '../../core/life-items/commands';
import type { LifeItem } from '../../core/life-items/types';
import { endAt } from '../../features/items/dateFields';
import { itemSpan } from '../../core/rhythm/openTime';

const ctx = { now: () => new Date('2026-10-02T09:00:00Z'), newId: () => 'e' };
const item: LifeItem = {
  id: 'i', userId: 'u', type: 'DO', title: 'Dentist', status: 'OPEN', important: false, source: 'MANUAL', carried: false,
  scheduledAt: '2026-10-02T16:00:00.000Z', endsAt: '2026-10-02T17:00:00.000Z', createdAt: '', updatedAt: '',
};

describe('end times', () => {
  it('keeps the length when the start moves, and clears with the start', () => {
    expect(scheduleItem(ctx, item, '2026-10-03T10:00:00.000Z').item.endsAt).toBe('2026-10-03T11:00:00.000Z');
    expect(scheduleItem(ctx, item, undefined).item.endsAt).toBeUndefined();
  });

  it('moves with a routine to its next time', () => {
    const routine = { ...item, repeat: { kind: 'EVERY_N_DAYS' as const, interval: 7 } };
    expect(completeRoutine(ctx, routine).item.endsAt).toBe('2026-10-09T17:00:00.000Z');
  });

  it('keeps only an end after the start', () => {
    expect(setEnd(ctx, item, '2026-10-02T15:00:00.000Z').item.endsAt).toBeUndefined();
    expect(setEnd(ctx, { ...item, endsAt: undefined }, '2026-10-02T18:00:00.000Z').item.endsAt).toBe('2026-10-02T18:00:00.000Z');
  });

  it('reads an earlier end as the next morning, and holds the real length', () => {
    const end = endAt('2026-10-02', '22:00', '02:00')!;
    expect(new Date(end).getTime() - new Date(2026, 9, 2, 22).getTime()).toBe(4 * 3_600_000);
    expect(endAt('2026-10-02', '22:00', '')).toBeUndefined();
    const span = itemSpan(item.scheduledAt!, item.endsAt);
    expect(span.end.getTime() - span.start.getTime()).toBe(3_600_000);
  });
});
