import { tripTotals, type Booking, type Money, type Spend, type Trip } from './model';

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
