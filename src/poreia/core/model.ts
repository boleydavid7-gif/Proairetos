import { addDays, daysBetween } from '../../core/scheduling/dates';

/*
 * Poreia's records. A trip holds the place and dates; bookings, the day-by-day plan, packing and spending each point
 * at their trip by id, so every record syncs on its own. Dates are local "YYYY-MM-DD"; times local "HH:MM".
 */

export type Money = { cents: number; currency: string };

export type Place = {
  name: string;
  /** "Lisbon, Portugal": the name with its region and country, as the place search gave it. */
  label?: string;
  country?: string;
  /** ISO 3166-1 alpha-2, for holidays and country facts. */
  countryCode?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
};

/** Where the person is with it. Being there and being back follow from the dates. */
export type TripStage = 'idea' | 'planning' | 'booked';

export type Trip = {
  id: string;
  name: string;
  place?: Place;
  /** Where it starts from, when not the home place in Settings. */
  from?: Place;
  start?: string;
  end?: string;
  travelers: number;
  stage: TripStage;
  budget?: Money;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingKind = 'flight' | 'stay' | 'car' | 'train' | 'bus' | 'cruise' | 'event' | 'tour' | 'food' | 'other';

export const BOOKING_KINDS: { id: BookingKind; label: string }[] = [
  { id: 'flight', label: 'Flight' },
  { id: 'stay', label: 'Stay' },
  { id: 'car', label: 'Car' },
  { id: 'train', label: 'Train' },
  { id: 'bus', label: 'Bus or ferry' },
  { id: 'cruise', label: 'Cruise' },
  { id: 'event', label: 'Event' },
  { id: 'tour', label: 'Tour' },
  { id: 'food', label: 'Table' },
  { id: 'other', label: 'Other' },
];

export const kindLabel = (kind: BookingKind) => BOOKING_KINDS.find((each) => each.id === kind)?.label ?? 'Booking';

export type Booking = {
  id: string;
  tripId: string;
  kind: BookingKind;
  title: string;
  /** Who it is with: an airline, a hotel, Airbnb, a cruise line. */
  provider?: string;
  confirmation?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  /** Departure and arrival for travel ("JFK", "Lisbon"). */
  from?: string;
  to?: string;
  address?: string;
  cost?: Money;
  link?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanItem = {
  id: string;
  tripId: string;
  date: string;
  time?: string;
  title: string;
  where?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type PackItem = {
  id: string;
  tripId: string;
  name: string;
  packed: boolean;
  group: PackGroup;
  createdAt: string;
};

export type PackGroup = 'documents' | 'clothes' | 'wash' | 'tech' | 'health' | 'other';

export const PACK_GROUPS: { id: PackGroup; label: string }[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'clothes', label: 'Clothes' },
  { id: 'wash', label: 'Toiletries' },
  { id: 'tech', label: 'Tech' },
  { id: 'health', label: 'Health' },
  { id: 'other', label: 'Other' },
];

export type SpendCategory = 'travel' | 'stay' | 'food' | 'doing' | 'shopping' | 'other';

export const SPEND_CATEGORIES: { id: SpendCategory; label: string }[] = [
  { id: 'travel', label: 'Getting around' },
  { id: 'stay', label: 'Stays' },
  { id: 'food', label: 'Food' },
  { id: 'doing', label: 'Things to do' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
];

export type Spend = {
  id: string;
  tripId: string;
  date: string;
  what: string;
  amount: Money;
  category: SpendCategory;
  createdAt: string;
};

// ---------- Trips ----------

export type Phase =
  | { kind: 'someday' }
  | { kind: 'ahead'; days: number }
  | { kind: 'now'; day: number; of: number }
  | { kind: 'past'; daysAgo: number };

/** Where a trip stands against today: no dates yet, days to go, day n of m, or done. */
export function phaseOf(trip: Pick<Trip, 'start' | 'end'>, today: string): Phase {
  if (!trip.start) return { kind: 'someday' };
  const end = trip.end && trip.end >= trip.start ? trip.end : trip.start;
  if (today < trip.start) return { kind: 'ahead', days: daysBetween(today, trip.start) };
  if (today > end) return { kind: 'past', daysAgo: daysBetween(end, today) };
  return { kind: 'now', day: daysBetween(trip.start, today) + 1, of: daysBetween(trip.start, end) + 1 };
}

/** "In 12 days", "Tomorrow", "Day 3 of 7", "No dates yet". */
export function phaseText(phase: Phase): string {
  switch (phase.kind) {
    case 'someday':
      return 'No dates yet';
    case 'ahead':
      return phase.days === 0 ? 'Today' : phase.days === 1 ? 'Tomorrow' : `In ${phase.days} days`;
    case 'now':
      return `Day ${phase.day} of ${phase.of}`;
    case 'past':
      return phase.daysAgo <= 1 ? 'Back yesterday' : `Back ${phase.daysAgo} days`;
  }
}

/** Nights away: the end date minus the start. */
export const nightsOf = (trip: Pick<Trip, 'start' | 'end'>) => (trip.start && trip.end && trip.end > trip.start ? daysBetween(trip.start, trip.end) : 0);

/** Every date of the trip, first to last. */
export function tripDates(trip: Pick<Trip, 'start' | 'end'>): string[] {
  if (!trip.start) return [];
  const end = trip.end && trip.end >= trip.start ? trip.end : trip.start;
  const dates: string[] = [];
  for (let date = trip.start; date <= end && dates.length < 400; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** On now first, then the soonest ahead, then ideas without dates, then the ones already taken (latest first). */
export function sortTrips<T extends Pick<Trip, 'start' | 'end' | 'updatedAt'>>(trips: readonly T[], today: string): { now: T[]; ahead: T[]; someday: T[]; past: T[] } {
  const now: T[] = [];
  const ahead: T[] = [];
  const someday: T[] = [];
  const past: T[] = [];
  for (const trip of trips) {
    const phase = phaseOf(trip, today);
    (phase.kind === 'now' ? now : phase.kind === 'ahead' ? ahead : phase.kind === 'someday' ? someday : past).push(trip);
  }
  ahead.sort((a, b) => a.start!.localeCompare(b.start!));
  someday.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  past.sort((a, b) => (b.end ?? b.start!).localeCompare(a.end ?? a.start!));
  return { now, ahead, someday, past };
}

// ---------- The plan, day by day ----------

export type DayEntry = { kind: 'booking'; booking: Booking; time?: string; ends?: boolean } | { kind: 'plan'; item: PlanItem; time?: string };

/**
 * Each day of the trip with what is on it: bookings on the day they start (and stays and cars again on the day they
 * end), the person's own plans, timed things in order and untimed after them.
 */
export function daysOf(trip: Pick<Trip, 'start' | 'end'>, bookings: readonly Booking[], plans: readonly PlanItem[]): { date: string; entries: DayEntry[] }[] {
  const dates = tripDates(trip);
  const extra = new Set<string>();
  for (const booking of bookings) if (booking.startDate && !dates.includes(booking.startDate)) extra.add(booking.startDate);
  for (const item of plans) if (!dates.includes(item.date)) extra.add(item.date);
  const all = [...dates, ...extra].sort();
  return all.map((date) => {
    const entries: DayEntry[] = [];
    for (const booking of bookings) {
      if (booking.startDate === date) entries.push({ kind: 'booking', booking, time: booking.startTime });
      else if (booking.endDate === date && booking.endDate !== booking.startDate && (booking.kind === 'stay' || booking.kind === 'car' || booking.kind === 'cruise'))
        entries.push({ kind: 'booking', booking, time: booking.endTime, ends: true });
    }
    for (const item of plans) if (item.date === date) entries.push({ kind: 'plan', item, time: item.time });
    entries.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
    return { date, entries };
  });
}

/** What a booking says on its day: "Check-in", "Check-out", "Pick-up", "Return", or its title. */
export function entryTitle(entry: DayEntry): string {
  if (entry.kind === 'plan') return entry.item.title;
  const { booking, ends } = entry;
  if (booking.kind === 'stay') return `${ends ? 'Check-out' : 'Check-in'}: ${booking.title}`;
  if (booking.kind === 'car') return `${ends ? 'Return' : 'Pick-up'}: ${booking.title}`;
  if (booking.kind === 'cruise') return `${ends ? 'Disembark' : 'Embark'}: ${booking.title}`;
  return booking.title;
}

// ---------- Money ----------

const minor = (currency: string) => (['JPY', 'KRW', 'ISK', 'CLP', 'VND'].includes(currency) ? 0 : 2);

/** "$1,240", "€85.50": whole amounts without cents. */
export function moneyText(money: Money, locale?: string): string {
  const digits = money.cents % 100 === 0 ? 0 : minor(money.currency);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(money.cents / 100);
  } catch {
    return `${(money.cents / 100).toFixed(digits)} ${money.currency}`;
  }
}

/** "1,240.50", "85", "12,50" → cents; undefined when it is not an amount. */
export function readAmount(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(cleaned)) return undefined;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normal = cleaned;
  // "12,50" or "1.240,50": the comma is the decimal mark.
  if (lastComma > lastDot && cleaned.length - lastComma - 1 === 2) normal = cleaned.replace(/\./g, '').replace(',', '.');
  else normal = cleaned.replace(/,/g, '');
  const value = Number(normal);
  return Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

/**
 * A trip's money in one currency: bookings' costs and spends, each converted with `rates` (units of `currency` per
 * one unit of theirs). Amounts in a currency with no rate are listed apart, never guessed.
 */
export function tripTotals(bookings: readonly Pick<Booking, 'cost' | 'kind'>[], spends: readonly Pick<Spend, 'amount' | 'category'>[], currency: string, rates: Record<string, number>) {
  let booked = 0;
  let spent = 0;
  const byCategory = new Map<SpendCategory, number>();
  const unconverted: Money[] = [];
  const convert = (money: Money): number | undefined => {
    if (money.currency === currency) return money.cents;
    const rate = rates[money.currency];
    return rate ? Math.round(money.cents * rate) : undefined;
  };
  const categoryOf = (kind: BookingKind): SpendCategory =>
    kind === 'stay' ? 'stay' : kind === 'event' || kind === 'tour' ? 'doing' : kind === 'food' ? 'food' : kind === 'other' ? 'other' : 'travel';
  for (const booking of bookings) {
    if (!booking.cost) continue;
    const cents = convert(booking.cost);
    if (cents === undefined) unconverted.push(booking.cost);
    else {
      booked += cents;
      byCategory.set(categoryOf(booking.kind), (byCategory.get(categoryOf(booking.kind)) ?? 0) + cents);
    }
  }
  for (const spend of spends) {
    const cents = convert(spend.amount);
    if (cents === undefined) unconverted.push(spend.amount);
    else {
      spent += cents;
      byCategory.set(spend.category, (byCategory.get(spend.category) ?? 0) + cents);
    }
  }
  return { booked, spent, total: booked + spent, byCategory, unconverted };
}
