export type TripStatus = 'idea' | 'planning' | 'tentative' | 'booked' | 'in-progress' | 'completed' | 'canceled';

export type Trip = {
  id: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status: TripStatus;
  travelers: string[];
  createdAt: string;
  updatedAt: string;
};

export type ItineraryItemStatus = 'planned' | 'confirmed' | 'completed' | 'canceled';

export type ItineraryItem = {
  id: string;
  tripId: string;
  date?: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  address?: string;
  mapLink?: string;
  reservationId?: string;
  expectedCostCents?: number;
  travelers: string[];
  status: ItineraryItemStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingType = 'flight' | 'lodging' | 'rental-car' | 'train' | 'cruise' | 'bus' | 'tour' | 'restaurant' | 'ticket' | 'other';
export type BookingStatus = 'planned' | 'reserved' | 'confirmed' | 'canceled' | 'refunded' | 'completed';

export type Booking = {
  id: string;
  tripId: string;
  type: BookingType;
  provider: string;
  confirmationNumber?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  address?: string;
  contact?: string;
  cancellationDeadline?: string;
  bookingLink?: string;
  depositCents?: number;
  totalCents?: number;
  amountPaidCents?: number;
  currency: string;
  status: BookingStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

/** The remaining amount is derived from the booking record so it cannot drift from its payment history. */
export function bookingRemaining(booking: Booking): number {
  return Math.max(0, (booking.totalCents ?? 0) - (booking.amountPaidCents ?? 0));
}

/** Whether two timed itinerary items on the same day overlap. All-day items never block another item. */
export function itineraryItemsOverlap(first: ItineraryItem, second: ItineraryItem): boolean {
  if (!first.date || first.date !== second.date || !first.startTime || !first.endTime || !second.startTime || !second.endTime) return false;
  return first.startTime < second.endTime && second.startTime < first.endTime;
}

export type PlaceIdea = {
  id: string;
  name: string;
  location?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};
