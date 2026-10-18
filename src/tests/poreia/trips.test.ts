import { describe, expect, it } from 'vitest';
import { bookingRemaining, itineraryItemsOverlap, type Booking, type ItineraryItem } from '../../poreia/core/trips';

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
});
