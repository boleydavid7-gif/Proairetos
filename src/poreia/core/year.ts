import { countText, facts, inYear, shortDay, type Year } from '../../core/year/year';
import { nightsOf, placesOf, type Booking, type Place, type Trip } from './model';
import { hoursText, type TimeOff } from './timeOff';

/*
 * Poreia's year and the places been: trips that started in the year (or before today, for "been"), their nights,
 * places and countries, flights, and time off taken. Counts and the person's own trips only; nothing ranked.
 */

/** A country's name in the person's language, from its code. */
export function countryName(code: string, locale?: string): string {
  try {
    return new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Trips already begun by today: the ones that count as been. */
export const beenTrips = (list: readonly Trip[], today: string) => list.filter((trip) => trip.start && trip.start <= today);

/** Every place of the trips been, once each by name and country, with how many trips went there and the last date. */
export function placesBeen(list: readonly Trip[], today: string): { place: Place; trips: number; last: string }[] {
  const seen = new Map<string, { place: Place; trips: number; last: string }>();
  for (const trip of beenTrips(list, today)) {
    for (const stop of placesOf(trip)) {
      const key = `${stop.place.name.toLowerCase()}|${stop.place.countryCode ?? ''}`;
      const at = stop.start ?? trip.start!;
      const known = seen.get(key);
      if (known) seen.set(key, { place: known.place.lat === undefined ? stop.place : known.place, trips: known.trips + 1, last: at > known.last ? at : known.last });
      else seen.set(key, { place: stop.place, trips: 1, last: at });
    }
  }
  return [...seen.values()].sort((a, b) => b.last.localeCompare(a.last));
}

/** Countries been, by how many places in each, with their names. */
export function countriesBeen(list: readonly Trip[], today: string, locale?: string): { code: string; name: string; places: number }[] {
  const counts = new Map<string, number>();
  for (const { place } of placesBeen(list, today)) if (place.countryCode) counts.set(place.countryCode.toUpperCase(), (counts.get(place.countryCode.toUpperCase()) ?? 0) + 1);
  return [...counts].map(([code, places]) => ({ code, name: countryName(code, locale), places })).sort((a, b) => a.name.localeCompare(b.name));
}

/** The year's trips as facts and lists, for the family's Your year page. */
export function poreiaYear(list: readonly Trip[], allBookings: readonly Pick<Booking, 'tripId' | 'kind'>[], offs: readonly TimeOff[], year: number, today: string): Year {
  const trips = list.filter((trip) => inYear(trip.start, year) && trip.start! <= today).sort((a, b) => a.start!.localeCompare(b.start!));
  const ids = new Set(trips.map((trip) => trip.id));
  const nights = trips.reduce((sum, trip) => sum + nightsOf(trip), 0);
  const places = placesBeen(trips, today);
  const countries = new Set(places.map((each) => each.place.countryCode?.toUpperCase()).filter(Boolean));
  const flights = allBookings.filter((each) => ids.has(each.tripId) && each.kind === 'flight').length;
  const taken = offs.filter((off) => off.status === 'approved' && inYear(off.start, year) && off.start <= today).reduce((sum, off) => sum + off.hours, 0);
  return {
    facts: facts(
      ['Trips', trips.length ? countText(trips.length) : undefined],
      ['Nights away', nights ? countText(nights) : undefined],
      ['Places', places.length ? countText(places.length) : undefined],
      ['Countries', countries.size ? countText(countries.size) : undefined],
      ['Flights', flights ? countText(flights) : undefined],
      ['Time off taken', taken ? hoursText(taken) : undefined],
    ),
    lists: trips.length ? [{ title: 'Trips', lines: trips.map((trip) => `${shortDay(trip.start!)} · ${trip.name}${nightsOf(trip) ? ` · ${nightsOf(trip)} ${nightsOf(trip) === 1 ? 'night' : 'nights'}` : ''}`) }] : [],
  };
}

/** Dates the year chips are made from. */
export const poreiaDates = (list: readonly Trip[]) => list.map((trip) => trip.start);
