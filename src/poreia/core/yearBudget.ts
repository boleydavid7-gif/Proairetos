import { tripTotals, type Booking, type Money, type Spend, type SpendCategory, type Trip } from './model';

export type YearTrips = {
  /** What the year's trips take, in the year budget's currency. */
  cents: number;
  count: number;
  /** Trips left out because an amount could not be converted. */
  unconverted: number;
};

/**
 * The trips starting in a year, each counted at its budget, or at what it has cost so far when that is more. Trips
 * with no date are left out; `except` leaves out the trip being edited.
 */
export function yearTrips(
  list: readonly Trip[],
  allBookings: readonly Pick<Booking, 'tripId' | 'cost' | 'kind'>[],
  allSpends: readonly Pick<Spend, 'tripId' | 'amount' | 'category'>[],
  year: number,
  currency: string,
  rates: Record<string, number>,
  except?: string,
): YearTrips {
  const convert = (money: Money): number | undefined => (money.currency === currency ? money.cents : rates[money.currency] ? Math.round(money.cents * rates[money.currency]) : undefined);
  let cents = 0;
  let count = 0;
  let unconverted = 0;
  for (const trip of list) {
    if (trip.id === except || !trip.start || Number(trip.start.slice(0, 4)) !== year) continue;
    const costs = tripTotals(
      allBookings.filter((each) => each.tripId === trip.id),
      allSpends.filter((each) => each.tripId === trip.id),
      currency,
      rates,
    );
    const budget = trip.budget ? convert(trip.budget) : 0;
    if (budget === undefined || costs.unconverted.length) unconverted += 1;
    cents += Math.max(budget ?? 0, costs.total);
    count += 1;
  }
  return { cents, count, unconverted };
}

/** Every currency the year's trips use, so rates can be fetched once. */
export function currenciesIn(list: readonly Trip[], allBookings: readonly Pick<Booking, 'cost'>[], allSpends: readonly Pick<Spend, 'amount'>[]): string[] {
  return [...new Set([...list.map((trip) => trip.budget?.currency), ...allBookings.map((each) => each.cost?.currency), ...allSpends.map((each) => each.amount.currency)].filter((code): code is string => Boolean(code)))];
}

export type TripMoney = { id: string; cost: number; budget?: number };

export type YearSpending = {
  /** What the year's trips have cost so far: bookings and spending. */
  spent: number;
  /** Each trip at its budget, or its costs when more (as `yearTrips`). */
  planned: number;
  byCategory: Map<SpendCategory, number>;
  trips: TripMoney[];
  /** Amounts in a currency with no rate, never guessed. */
  unconverted: Money[];
};

/** The year's travel money in one currency: what is spent, what the trips are planned at, by kind and by trip. */
export function yearSpending(
  list: readonly Trip[],
  allBookings: readonly Pick<Booking, 'tripId' | 'cost' | 'kind'>[],
  allSpends: readonly Pick<Spend, 'tripId' | 'amount' | 'category'>[],
  year: number,
  currency: string,
  rates: Record<string, number>,
): YearSpending {
  const convert = (money: Money): number | undefined => (money.currency === currency ? money.cents : rates[money.currency] ? Math.round(money.cents * rates[money.currency]) : undefined);
  const result: YearSpending = { spent: 0, planned: 0, byCategory: new Map(), trips: [], unconverted: [] };
  for (const trip of list) {
    if (!trip.start || Number(trip.start.slice(0, 4)) !== year) continue;
    const costs = tripTotals(
      allBookings.filter((each) => each.tripId === trip.id),
      allSpends.filter((each) => each.tripId === trip.id),
      currency,
      rates,
    );
    const budget = trip.budget ? convert(trip.budget) : undefined;
    if (trip.budget && budget === undefined) result.unconverted.push(trip.budget);
    result.unconverted.push(...costs.unconverted);
    result.spent += costs.total;
    result.planned += Math.max(budget ?? 0, costs.total);
    for (const [category, cents] of costs.byCategory) result.byCategory.set(category, (result.byCategory.get(category) ?? 0) + cents);
    result.trips.push({ id: trip.id, cost: costs.total, ...(budget !== undefined ? { budget } : {}) });
  }
  return result;
}

/** Years to choose between: this one, the next, and any year a trip starts in, oldest first. */
export function budgetYears(list: readonly Pick<Trip, 'start'>[], thisYear: number): number[] {
  const years = new Set([thisYear, thisYear + 1]);
  for (const trip of list) if (trip.start) years.add(Number(trip.start.slice(0, 4)));
  return [...years].sort((a, b) => a - b);
}
