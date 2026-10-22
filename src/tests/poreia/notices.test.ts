import { describe, expect, it } from 'vitest';
import { defaultTripNotices, tripNotices } from '../../poreia/core/notices';
import type { Booking, PackItem, PlanItem, Trip } from '../../poreia/core/model';
import { sourceOf } from '../../core/notify/sources';

const stamp = '2026-10-01T00:00:00.000Z';
const trip: Trip = { id: 't1', name: 'Lisbon', start: '2026-11-10', end: '2026-11-13', travelers: 2, stage: 'booked', createdAt: stamp, updatedAt: stamp };
const booking = (over: Partial<Booking>): Booking => ({ id: 'b', tripId: 't1', kind: 'other', title: 'x', createdAt: stamp, updatedAt: stamp, ...over });
const flight = booking({ id: 'f', kind: 'flight', title: 'TP 210', startDate: '2026-11-10', startTime: '08:10', from: 'JFK', confirmation: 'ABC123' });
const stay = booking({ id: 's', kind: 'stay', title: 'Casa Azul', startDate: '2026-11-10', startTime: '15:00', endDate: '2026-11-13', endTime: '11:00', address: 'Rua A 1' });
const plan: PlanItem = { id: 'p', tripId: 't1', date: '2026-11-11', time: '21:30', title: 'Fado night', where: 'Alfama', createdAt: stamp, updatedAt: stamp };
const pack = (packed: boolean, id: string): PackItem => ({ id, tripId: 't1', name: id, packed, group: 'other', createdAt: stamp });

const now = new Date(2026, 10, 1, 12, 0);
const until = new Date(2026, 10, 20);
const at = (notice: { at: Date }) => `${notice.at.getMonth() + 1}/${notice.at.getDate()} ${String(notice.at.getHours()).padStart(2, '0')}:${String(notice.at.getMinutes()).padStart(2, '0')}`;

describe('trip reminders', () => {
  const all = tripNotices([trip], [flight, stay], [plan], [pack(false, 'a'), pack(false, 'b'), pack(true, 'c')], defaultTripNotices, now, until);
  const byKey = (start: string) => all.find((notice) => notice.key.startsWith(start))!;

  it('says when travel leaves, ahead of time, and the check-in a day before', () => {
    expect(at(byKey('poreia:leave:f'))).toBe('11/10 05:10');
    expect(byKey('poreia:leave:f').body).toContain('from JFK');
    expect(byKey('poreia:leave:f').body).toContain('Confirmation ABC123');
    expect(at(byKey('poreia:checkin:f'))).toBe('11/9 08:10');
    expect(byKey('poreia:leave:f').open).toBe('poreia:booked:f');
  });

  it('says check-in and check-out at a stay, and timed plans', () => {
    expect(at(byKey('poreia:start:s'))).toBe('11/10 14:00');
    expect(at(byKey('poreia:end:s'))).toBe('11/13 10:00');
    expect(byKey('poreia:end:s').body).toMatch(/^Check-out by /);
    expect(at(byKey('poreia:plan:p'))).toBe('11/11 20:30');
    expect(byKey('poreia:plan:p').open).toBe('poreia:plan:p');
  });

  it('says the evening before, with the first thing and what is left to pack', () => {
    const eve = byKey('poreia:eve:t1');
    expect(at(eve)).toBe('11/9 18:00');
    expect(eve.title).toBe('Lisbon tomorrow');
    expect(eve.body).toContain('TP 210');
    expect(eve.body).toContain('2 things left to pack');
  });

  it('follows the choices and leaves out what has passed', () => {
    expect(tripNotices([trip], [flight], [], [], { ...defaultTripNotices, on: false }, now, until)).toEqual([]);
    const noCheckIn = tripNotices([trip], [flight], [], [], { ...defaultTripNotices, checkIn: false, dayBefore: false }, now, until);
    expect(noCheckIn.map((notice) => notice.key.split(':')[1])).toEqual(['leave']);
    expect(tripNotices([trip], [flight], [], [], defaultTripNotices, new Date(2026, 10, 10, 6, 0), until).some((notice) => notice.key.startsWith('poreia:leave'))).toBe(false);
  });

  it('goes out as Poreia', () => {
    expect(sourceOf(all[0])).toBe('poreia');
  });
});
