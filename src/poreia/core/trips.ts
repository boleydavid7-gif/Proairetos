export type TripStatus = 'idea' | 'planning' | 'tentative' | 'booked' | 'in-progress' | 'completed' | 'canceled';

export type Trip = {
  id: string;
  name: string;
  destination?: string;
  tripType?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  status: TripStatus;
  travelers: string[];
  checklist?: TripTask[];
  packingItems?: PackingItem[];
  expenses?: TripExpense[];
  budgetCents?: number;
  budgetCurrency?: string;
  documents?: TripDocument[];
  createdAt: string;
  updatedAt: string;
};

export type TripTaskCategory = 'planning' | 'bookings' | 'itinerary' | 'documents' | 'before-you-go';

export type TripTask = {
  id: string;
  title: string;
  category: TripTaskCategory;
  completed: boolean;
  notApplicable?: boolean;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type PackingCategory = 'clothing' | 'essentials' | 'toiletries' | 'electronics' | 'documents' | 'other';

export type PackingItem = {
  id: string;
  name: string;
  category: PackingCategory;
  quantity: number;
  packed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type TripExpense = {
  id: string;
  description: string;
  category: 'transportation' | 'accommodation' | 'food' | 'activities' | 'shopping' | 'other';
  amountCents: number;
  currency: string;
  date?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TripDocument = {
  id: string;
  name: string;
  url?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export function suggestedTripTasks(trip: Trip): TripTask[] {
  const now = new Date().toISOString();
  const common: Array<[string, string]> = [
    ['planning', 'Choose destination'],
    ['planning', 'Confirm travel dates'],
    ['bookings', 'Record your first reservation'],
    ['itinerary', 'Build daily itinerary'],
    ['documents', 'Prepare travel documents'],
    ['before-you-go', 'Complete a final trip review'],
  ];
  const road = trip.tripType?.toLowerCase().includes('road');
  const extra: Array<[string, string]> = road ? [['planning', 'Plan the route'], ['before-you-go', 'Check vehicle readiness']] : [['bookings', 'Confirm transportation'], ['before-you-go', 'Arrange home or pet care']];
  return [...common, ...extra].map(([category, title]) => ({ id: `${trip.id}-${category}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, title, category: category as TripTaskCategory, completed: false, createdAt: now, updatedAt: now }));
}

export function tripTaskProgress(trip: Trip): { applicable: TripTask[]; complete: number; total: number } {
  const tasks = trip.checklist?.length ? trip.checklist : suggestedTripTasks(trip);
  const applicable = tasks.filter((task) => !task.notApplicable);
  return { applicable, complete: applicable.filter((task) => task.completed).length, total: applicable.length };
}

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

/** Cost still to fund: confirmed booking totals less payments, plus uncaptured itinerary estimates. */
export function tripRemainingCost(bookings: readonly Booking[], items: readonly ItineraryItem[]): number {
  const bookingsRemaining = bookings.reduce((sum, booking) => sum + Math.max(0, (booking.totalCents ?? 0) - (booking.amountPaidCents ?? 0)), 0);
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const itineraryEstimates = items.reduce((sum, item) => sum + (item.reservationId && bookingIds.has(item.reservationId) ? 0 : (item.expectedCostCents ?? 0)), 0);
  return bookingsRemaining + itineraryEstimates;
}

export type PlaceIdea = {
  id: string;
  name: string;
  location?: string;
  note?: string;
  category?: string;
  collection?: string;
  source?: 'curated' | 'manual' | 'maps' | 'external';
  provider?: string;
  providerId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  externalUrl?: string;
  itineraryItemId?: string;
  recentViewedAt?: string;
  tripId?: string;
  createdAt: string;
  updatedAt: string;
};
