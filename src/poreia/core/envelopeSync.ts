import type { EnvelopeSeen } from '../app/state';
import type { Money } from './model';

/*
 * A trip and its Oikonomia envelope kept in step. Against what was last seen in step, a side that changed passes the
 * change to the other: the trip's name to the envelope's name, its budget to the envelope's target and its start to
 * the envelope's date; from Oikonomia, the envelope's name and target come back to the trip (its date never moves the
 * trip). Both changed: the trip's change goes out. Money saved lives only in the envelope, so it needs no keeping.
 */

export type EnvelopeSide = { name: string; target: number; date?: string; currency: string };
export type TripSide = { name: string; budget?: Money; start?: string };
export type EnvelopePlan = { envelope?: Partial<EnvelopeSide>; trip?: Partial<TripSide>; seen: EnvelopeSeen };

const dateFor = (start: string | undefined, today: string) => (start && start > today ? start : undefined);

export function planEnvelopeSync(trip: TripSide, envelope: EnvelopeSide, seen: EnvelopeSeen | undefined, today: string): EnvelopePlan {
  // A budget in another currency than the envelope's is left alone either way.
  const sameMoney = !trip.budget || trip.budget.currency === envelope.currency;
  const budget = sameMoney ? trip.budget?.cents : undefined;
  const toEnvelope: Partial<EnvelopeSide> = {};
  const toTrip: Partial<TripSide> = {};

  if (!seen) {
    // First time together: each fills what the other is missing.
    if (budget && !envelope.target) toEnvelope.target = budget;
    else if (sameMoney && !budget && envelope.target) toTrip.budget = { cents: envelope.target, currency: envelope.currency };
    if (!envelope.date && dateFor(trip.start, today)) toEnvelope.date = dateFor(trip.start, today);
  } else {
    if (trip.name !== seen.tripName) toEnvelope.name = trip.name;
    else if (envelope.name !== seen.name) toTrip.name = envelope.name;

    if (sameMoney && budget !== seen.budget) toEnvelope.target = budget ?? 0;
    else if (sameMoney && envelope.target !== seen.target) toTrip.budget = envelope.target ? { cents: envelope.target, currency: envelope.currency } : undefined;

    if (trip.start !== seen.start) toEnvelope.date = dateFor(trip.start, today);
  }

  const nextEnvelope = { ...envelope, ...toEnvelope };
  const nextTrip = { ...trip, ...toTrip };
  const changedEnvelope = Object.entries(toEnvelope).some(([key, value]) => envelope[key as keyof EnvelopeSide] !== value);
  const changedTrip = 'name' in toTrip ? toTrip.name !== trip.name || 'budget' in toTrip : 'budget' in toTrip;
  return {
    ...(changedEnvelope ? { envelope: toEnvelope } : {}),
    ...(changedTrip ? { trip: toTrip } : {}),
    seen: {
      name: nextEnvelope.name,
      target: nextEnvelope.target,
      date: nextEnvelope.date,
      tripName: nextTrip.name,
      budget: nextTrip.budget && nextTrip.budget.currency === envelope.currency ? nextTrip.budget.cents : undefined,
      start: nextTrip.start,
    },
  };
}
