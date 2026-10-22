import { collection, stored } from '../../app/family/shell';
import { toLocalDate } from '../../core/scheduling/dates';
import type { Booking, PackItem, Place, PlanItem, Spend, Trip } from '../core/model';
import type { TravelDoc } from '../core/documents';
import type { Spot } from '../core/spots';
import type { ArrivedMail } from '../core/mail';
import { defaultSetup, type TimeOff, type TimeOffSetup } from '../core/timeOff';
import { defaultTripNotices, type TripNoticeChoices } from '../core/notices';

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
  /** What the person sets aside for travel in a year: a reference beside each trip's budget, never a limit. */
  yearBudget?: { cents: number; currency: string };
  /** Time off is set up once its balance and growth are given. */
  timeOff?: TimeOffSetup;
  /** The person's own name on shared trips and in who paid; Proairetos's name when not set. */
  me?: string;
  /** Reminders for bookings and plans, sent through Proairetos's notices. */
  notices: TripNoticeChoices;
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

export const settings = stored<PoreiaSettings>('poreia:settings', () => ({ started: false, currency: localCurrency(), travelers: 1, temperature: usesFahrenheit() ? 'F' : 'C', notices: defaultTripNotices }));

export const trips = collection<Trip>('poreia:trip:');
export const bookings = collection<Booking>('poreia:booking:');
export const plans = collection<PlanItem>('poreia:plan:');
export const packing = collection<PackItem>('poreia:pack:');
export const spends = collection<Spend>('poreia:spend:');
export const timeOff = collection<TimeOff>('poreia:off:');
/** Places saved to a trip, from the map, the guide, events and stays. */
export const spots = collection<Spot>('poreia:spot:');
/** Passports, visas, insurance: on this person's own devices only, never in a shared trip. */
export const docs = collection<TravelDoc>('poreia:doc:');
/** Booking emails that came in and wait to be placed on a trip. */
export const mails = collection<ArrivedMail>('poreia:mail:');

/**
 * This person's own links for each trip, kept apart from the trip so a shared trip never carries them: its Compass
 * goal, its Oikonomia envelope, and, without Oikonomia, what is saved toward it here.
 */
export type TripLinks = {
  goalId?: string;
  envelopeId?: string;
  saved?: { cents: number; currency: string };
  /** The trip and envelope as last kept in step, to tell which side changed since (`syncEnvelope`). */
  envelopeSeen?: EnvelopeSeen;
  /** The envelope was deleted in Oikonomia or unlinked here: not made again by itself. */
  envelopeGone?: boolean;
};
export type EnvelopeSeen = { name: string; target: number; date?: string; tripName: string; budget?: number; start?: string };
export const links = stored<Record<string, TripLinks>>('poreia:links', () => ({}));
export const linksOf = (tripId: string): TripLinks => links.load()[tripId] ?? {};
export function setLinks(tripId: string, patch: Partial<TripLinks>): () => void {
  const before = links.load();
  links.save({ ...before, [tripId]: { ...before[tripId], ...patch } });
  return () => links.save(before);
}

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
    spots: spots.list().filter((each) => each.tripId === trip.id),
    docs: docs.list().filter((each) => each.tripId === trip.id),
  };
  trips.remove(trip.id);
  its.bookings.forEach((each) => bookings.remove(each.id));
  its.plans.forEach((each) => plans.remove(each.id));
  its.packing.forEach((each) => packing.remove(each.id));
  its.spends.forEach((each) => spends.remove(each.id));
  its.spots.forEach((each) => spots.remove(each.id));
  its.docs.forEach((each) => docs.remove(each.id));
  return () => {
    trips.put(trip);
    its.bookings.forEach((each) => bookings.put(each));
    its.plans.forEach((each) => plans.put(each));
    its.packing.forEach((each) => packing.put(each));
    its.spends.forEach((each) => spends.put(each));
    its.spots.forEach((each) => spots.put(each));
    its.docs.forEach((each) => docs.put(each));
  };
}

/** The person's name for who paid: their own here, else the one Proairetos greets them with. */
export function myName(): string {
  const own = settings.load().me?.trim();
  if (own) return own;
  try {
    const greeted = localStorage.getItem('proairetos.displayName');
    return (greeted ? (JSON.parse(greeted) as string) : '').trim() || 'Me';
  } catch {
    return 'Me';
  }
}
