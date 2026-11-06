import { describe, expect, it } from 'vitest';
import { buildIcs } from '../../core/calendar/ics';
import { billCalendarEvents } from '../../oikonomia/core/calendar';
import { tripEvents } from '../../poreia/core/calendar';
import type { Booking, PlanItem, Trip } from '../../poreia/core/model';
import type { Bill } from '../../oikonomia/core/bills';

/* A person's own downloaded calendar files: a trip's and a bill's. */
const day = '2026-10-01T00:00:00.000Z';
describe('a person’s own downloaded files', () => {
  it('a trip’s file holds no confirmation code and no note', () => {
    const trip = { id: 't', name: 'Lisbon', start: '2026-11-07', end: '2026-11-12', createdAt: day, updatedAt: day } as unknown as Trip;
    const bookings = [
      { id: 'f', tripId: 't', kind: 'flight', title: 'TP 123', startDate: '2026-11-07', startTime: '08:15', endTime: '10:30', confirmation: 'CANARY-CODE', createdAt: day, updatedAt: day },
      { id: 's', tripId: 't', kind: 'stay', title: 'Hotel', startDate: '2026-11-07', endDate: '2026-11-12', confirmation: 'CANARY-CODE', createdAt: day, updatedAt: day },
    ] as unknown as Booking[];
    const plans = [{ id: 'p', tripId: 't', date: '2026-11-08', title: 'Fado', note: 'CANARY-NOTE', createdAt: day, updatedAt: day }, { id: 'q', tripId: 't', date: '2026-11-09', time: '10:00', title: 'Tram', note: 'CANARY-NOTE', createdAt: day, updatedAt: day }] as unknown as PlanItem[];
    const text = buildIcs(tripEvents(trip, bookings, plans), { name: 'Lisbon', now: new Date('2026-10-22T00:00:00Z') });
    expect(text).not.toMatch(/CANARY|Confirmation|DESCRIPTION/);
    expect(text).toContain('SUMMARY:Flight: TP 123');
  });
  it('a bill’s file holds the name and the date and no amount', () => {
    const bill = { id: 'b', name: 'Electric', amountCents: 7824, currency: 'USD', dueDate: '2026-11-07', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [], createdAt: day, updatedAt: day } as Bill;
    const text = buildIcs(billCalendarEvents([bill], '2026-11-01', '2026-12-31'), { name: 'Oikonomia', now: new Date('2026-11-05T00:00:00Z') });
    expect(text).toContain('SUMMARY:Electric');
    expect(text).not.toMatch(/78\.24|\$|7824|USD/);
  });
});
