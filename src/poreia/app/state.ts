import { collection, stored } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { Booking, PackItem, Place, PlanItem, Spend, Trip } from '../core/model';
import { defaultSetup, type TimeOff, type TimeOffSetup } from '../core/timeOff';

/*
 * Poreia keeps one record per key in browser storage, under `poreia:`, so each syncs (sealed) and backs up on its own.
 */

export type PoreiaSettings = {
  started: boolean;
  /** Where trips usually start from: the default "from" for flights and trains, and "abroad" for packing. */
  home?: Place;
  /** The currency budgets and totals are shown in. */
  currency: string;
  travelers: number;
  temperature: 'C' | 'F';
  /** Time off is set up once its balance and growth are given. */
  timeOff?: TimeOffSetup;
};

const usesFahrenheit = () => typeof navigator !== 'undefined' && /^en-(US|LR|MM)/.test(navigator.language);
const localCurrency = () => {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return ({ US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', JP: 'JPY', IN: 'INR', MX: 'MXN', BR: 'BRL', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', ZA: 'ZAR' } as Record<string, string>)[region ?? ''] ?? (['DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'IE', 'AT', 'BE', 'FI', 'GR'].includes(region ?? '') ? 'EUR' : 'USD');
  } catch {
    return 'USD';
  }
};

export const settings = stored<PoreiaSettings>('poreia:settings', () => ({ started: false, currency: localCurrency(), travelers: 1, temperature: usesFahrenheit() ? 'F' : 'C' }));

export const trips = collection<Trip>('poreia:trip:');
export const bookings = collection<Booking>('poreia:booking:');
export const plans = collection<PlanItem>('poreia:plan:');
export const packing = collection<PackItem>('poreia:pack:');
export const spends = collection<Spend>('poreia:spend:');
export const timeOff = collection<TimeOff>('poreia:off:');

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
export const today = () => toLocalDate(new Date());
export const nowStamp = () => new Date().toISOString();

export const timeOffSetup = (): TimeOffSetup | undefined => settings.load().timeOff;
export const setupOrDefault = (): TimeOffSetup => settings.load().timeOff ?? defaultSetup(today());

/** A trip and everything that points at it go together, and come back together with undo. */
export function removeTrip(trip: Trip): () => void {
  const its = {
    bookings: bookings.list().filter((each) => each.tripId === trip.id),
    plans: plans.list().filter((each) => each.tripId === trip.id),
    packing: packing.list().filter((each) => each.tripId === trip.id),
    spends: spends.list().filter((each) => each.tripId === trip.id),
  };
  trips.remove(trip.id);
  its.bookings.forEach((each) => bookings.remove(each.id));
  its.plans.forEach((each) => plans.remove(each.id));
  its.packing.forEach((each) => packing.remove(each.id));
  its.spends.forEach((each) => spends.remove(each.id));
  return () => {
    trips.put(trip);
    its.bookings.forEach((each) => bookings.put(each));
    its.plans.forEach((each) => plans.put(each));
    its.packing.forEach((each) => packing.put(each));
    its.spends.forEach((each) => spends.put(each));
  };
}
