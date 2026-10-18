import { describe, expect, it } from 'vitest';
import { poreiaCalendarEvents } from '../../poreia/core/calendar';
import type { LeaveRequest, PtoAccount, VacationPlan } from '../../poreia/core/pto';
import type { Booking, ItineraryItem, Trip } from '../../poreia/core/trips';

const trip: Trip = { id: 'trip', name: 'Coast week', destination: 'Maine', startDate: '2026-10-20', endDate: '2026-10-22', status: 'planning', travelers: [], createdAt: 'x', updatedAt: 'x' };
const account: PtoAccount = { id: 'account', name: 'Vacation', category: 'vacation', unit: 'hours', openingBalance: 0, openingDate: '2026-01-01', policy: { frequency: 'none', amount: 0, startDate: '2026-01-01' }, workProfileId: 'work', createdAt: 'x', updatedAt: 'x' };
const request: LeaveRequest = { id: 'leave', accountId: 'account', startDate: '2026-10-20', endDate: '2026-10-22', requestedAmount: 24, status: 'approved', createdAt: 'x', updatedAt: 'x' };

describe('Poreia calendar events', () => {
  it('turns a trip and approved leave into stable all-day ranges', () => {
    const events = poreiaCalendarEvents([trip], [], [], [request], [account], new Date('2026-10-19T00:00:00'), new Date('2026-10-24T00:00:00'));
    expect(events.map((event) => [event.uid, event.date, event.dateEnd])).toEqual([
      ['poreia-trip-trip', '2026-10-20', '2026-10-23'],
      ['poreia-leave-leave', '2026-10-20', '2026-10-23'],
    ]);
  });

  it('includes timed itinerary and booking records while omitting canceled bookings', () => {
    const item: ItineraryItem = { id: 'item', tripId: 'trip', date: '2026-10-21', title: 'Dinner', startTime: '18:00', endTime: '19:30', travelers: [], status: 'confirmed', createdAt: 'x', updatedAt: 'x' };
    const booking: Booking = { id: 'booking', tripId: 'trip', type: 'lodging', provider: 'Harbor Inn', startDate: '2026-10-21', startTime: '15:00', endTime: '16:00', currency: 'USD', status: 'confirmed', createdAt: 'x', updatedAt: 'x' };
    const canceled: Booking = { ...booking, id: 'canceled', status: 'canceled' };
    const events = poreiaCalendarEvents([trip], [booking, canceled], [item], [], [], new Date('2026-10-21T00:00:00'), new Date('2026-10-22T00:00:00'));
    expect(events.map((event) => event.uid)).toEqual(['poreia-trip-trip', 'poreia-booking-booking', 'poreia-itinerary-item']);
    expect(events[1].start?.getHours()).toBe(15);
    expect(events[2].start?.getHours()).toBe(18);
  });

  it('uses one linked vacation event instead of duplicating the trip and leave', () => {
    const vacation: VacationPlan = { id: 'vacation', name: 'Coast break', startDate: trip.startDate!, endDate: trip.endDate!, status: 'planned', ptoRequired: 24, tripId: trip.id, leaveRequestId: request.id, calendarSync: 'synced', createdAt: 'x', updatedAt: 'x' };
    const events = poreiaCalendarEvents([trip], [], [], [request], [account], new Date('2026-10-19T00:00:00'), new Date('2026-10-24T00:00:00'), [vacation]);
    expect(events.map((event) => event.uid)).toEqual(['poreia-vacation-vacation']);
  });
});
