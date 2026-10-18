import { describe, expect, it } from 'vitest';
import { monthlyContribution, savingsContribution, savingsPeriods } from '../../poreia/core/savings';
import { bookingRemaining, itineraryItemsOverlap, tripRemainingCost, type Booking, type ItineraryItem } from '../../poreia/core/trips';

const booking = (totalCents: number, amountPaidCents: number): Booking => ({
  id: 'booking', tripId: 'trip', type: 'lodging', provider: 'Stay', currency: 'USD', status: 'reserved',
  totalCents, amountPaidCents, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
});

const item = (id: string, startTime: string, endTime: string): ItineraryItem => ({
  id, tripId: 'trip', date: '2026-10-20', title: id, startTime, endTime, travelers: [], status: 'planned',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('Poreia trip workspace helpers', () => {
  it('derives remaining reservation cost and never goes below zero', () => {
    expect(bookingRemaining(booking(15000, 4000))).toBe(11000);
    expect(bookingRemaining(booking(15000, 20000))).toBe(0);
  });

  it('detects overlapping timed itinerary items on the same day', () => {
    expect(itineraryItemsOverlap(item('first', '10:00', '11:00'), item('second', '10:30', '12:00'))).toBe(true);
    expect(itineraryItemsOverlap(item('first', '10:00', '11:00'), item('second', '11:00', '12:00'))).toBe(false);
    expect(itineraryItemsOverlap(item('first', '10:00', '11:00'), { ...item('second', '10:30', '12:00'), date: '2026-10-21' })).toBe(false);
  });

  it('calculates remaining trip cost without double-counting linked itinerary items', () => {
    const reserved = booking(15000, 4000);
    expect(tripRemainingCost([{ ...reserved, id: 'stay' }], [{ ...item('dinner', '18:00', '19:00'), expectedCostCents: 2500 }, { ...item('stay-plan', '10:00', '11:00'), reservationId: 'stay', expectedCostCents: 5000 }])).toBe(13500);
  });

  it('turns a savings target into predictable contribution periods', () => {
    expect(savingsPeriods('2026-01-01', '2026-02-01', 'weekly')).toBe(5);
    expect(savingsContribution(10000, 0, '2026-01-01', '2026-02-01', 'monthly')).toBe(5000);
    expect(monthlyContribution(1000, 'weekly')).toBe(4333);
  });
});
