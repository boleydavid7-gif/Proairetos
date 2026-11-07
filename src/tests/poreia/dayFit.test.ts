import { describe, expect, it } from 'vitest';
import { between, openStretches } from '../../poreia/core/dayFit';
import type { Booking, DayEntry, PlanItem } from '../../poreia/core/model';

const plan = (id: string, patch: Partial<PlanItem> = {}): DayEntry => {
  const item = { id, tripId: 't', date: '2027-03-01', title: id, createdAt: '', updatedAt: '', ...patch } as PlanItem;
  return { kind: 'plan', item, time: item.time };
};
const booking = (patch: Partial<Booking>): DayEntry => {
  const value = { id: 'b', tripId: 't', kind: 'tour', title: 'Tour', startDate: '2027-03-01', createdAt: '', updatedAt: '', ...patch } as Booking;
  return { kind: 'booking', booking: value, time: value.startTime };
};

describe('days that fit', () => {
  it('says a short walk, or how far apart', () => {
    const a = plan('a', { lat: 38.7139, lon: -9.1394 });
    const b = plan('b', { lat: 38.7169, lon: -9.1399 });
    expect(between(a, b)).toMatch(/^About \d+ min walk · \d+ m$/);
    const far = plan('c', { lat: 38.6916, lon: -9.2160 });
    expect(between(a, far)).toMatch(/km apart$/);
    expect(between(a, plan('d'))).toBeUndefined();
    expect(between(a, a)).toBeUndefined();
  });

  it('finds stretches with nothing set, after a booking’s end when known', () => {
    const entries = [booking({ startTime: '09:00', endTime: '12:00' }), plan('lunch', { time: '12:30' }), plan('show', { time: '19:00' })];
    const open = openStretches(entries);
    expect(open.get(0)).toBeUndefined();
    expect(open.get(1)).toEqual({ from: '12:30', to: '19:00' });
    expect(openStretches([plan('x', { time: '10:00' }), plan('y')]).size).toBe(0);
  });
});
