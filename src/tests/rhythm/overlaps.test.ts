import { describe, expect, it } from 'vitest';
import { nextOpen, overlaps } from '../../core/rhythm/overlaps';
import type { LifeItem } from '../../core/life-items/types';
import { atTime } from '../../core/scheduling/dates';

const at = (time: string) => atTime('2026-10-02', time);
const item = (id: string, time: string, fields: Partial<LifeItem> = {}): LifeItem => ({
  id, userId: 'u', type: 'DO', title: id, status: 'OPEN', important: false, source: 'CAPTURE', carried: false,
  scheduledAt: at(time).toISOString(), createdAt: '', updatedAt: '', ...fields,
});

describe('overlaps', () => {
  const busy = [{ start: at('09:00'), end: at('17:00'), title: 'Work' }];
  it('names what a timed item now shares its time with', () => {
    const found = overlaps([item('dentist', '16:45'), item('call', '17:00'), item('done', '10:00', { status: 'DONE' })], busy, at('00:00'), at('23:59'));
    expect(found.map((o) => [o.item.id, o.with])).toEqual([['dentist', 'Work']]);
    expect(found[0].key).toBe(`dentist@${at('16:45').toISOString()}`);
  });

  it('finds the next open stretch', () => {
    const stretches = [{ start: at('07:00'), end: at('09:00') }, { start: at('17:00'), end: at('22:00') }];
    expect(nextOpen(stretches, at('10:00'))).toEqual(at('17:00'));
    expect(nextOpen(stretches, at('18:00'))).toBeUndefined();
  });
});
