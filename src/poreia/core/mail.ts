import { addDays } from '../../core/scheduling/dates';
import { readConfirmation, type ReadBooking } from './confirmations';
import { kindLabel, placesOf, type Booking, type Trip } from './model';

/*
 * Booking emails forwarded to the person's Poreia address: read into a booking, and placed on the trip they belong to
 * when that is clear (its dates hold the booking's first day, or, with no date, one trip still to come is named in it). Anything else
 * waits on the Trips page for the person to place.
 */

/** One email as the Worker keeps it (`worker/tripMail.ts`): subject, sender, words, booking data. */
export type MailWords = { s: string; f: string; t: string; j?: string; at: string };

/** An email that came in and is not on a trip yet. */
export type ArrivedMail = { id: string; subject: string; from: string; at: string; read?: ReadBooking; excerpt: string };

/** The booking in an email: its schema.org data first, then the subject and words. */
export function readMail(mail: MailWords, thisYear = new Date().getFullYear()): ReadBooking | undefined {
  return readConfirmation([mail.j, mail.s, mail.t].filter(Boolean).join('\n'), thisYear);
}

const named = (text: string, name: string) => name.length >= 3 && new RegExp(`(^|[^\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(text);

/** The trip a booking belongs to, when only one fits; undefined when none or several do. */
export function tripFor(read: ReadBooking | undefined, list: readonly Trip[], text: string, today: string): Trip | undefined {
  const date = read?.startDate;
  if (date) {
    const holding = list.filter((trip) => trip.start && addDays(trip.start, -2) <= date && date <= addDays(trip.end ?? trip.start, 1));
    // A dated booking goes only where its dates fit; one that fits no trip waits for the person.
    return holding.length === 1 ? holding[0] : undefined;
  }
  const ahead = list.filter((trip) => !trip.end || trip.end >= today || !trip.start);
  const byName = ahead.filter((trip) => [trip.name, ...placesOf(trip).map((stop) => stop.place.name)].some((name) => named(`${read?.to ?? ''} ${read?.address ?? ''} ${text}`, name)));
  return byName.length === 1 ? byName[0] : undefined;
}

/** The same booking already on the trip: the same confirmation code, or the same kind and first day from the same provider. */
export function alreadyThere(read: ReadBooking, theirs: readonly Pick<Booking, 'confirmation' | 'kind' | 'startDate' | 'provider'>[]): boolean {
  return theirs.some(
    (each) =>
      (read.confirmation && each.confirmation && each.confirmation.toUpperCase() === read.confirmation.toUpperCase()) ||
      (read.startDate && each.startDate === read.startDate && each.kind === read.kind && read.provider && each.provider === read.provider),
  );
}

/** A booking made from what was read, on a trip; the email's subject is kept in its notes. */
export function bookingFrom(read: ReadBooking, tripId: string, subject: string, id: string, now: string): Booking {
  const fields = Object.fromEntries(Object.entries(read).filter(([, value]) => value !== undefined && value !== '')) as Partial<ReadBooking>;
  return {
    ...fields,
    kind: read.kind,
    title: read.title || read.provider || kindLabel(read.kind),
    id,
    tripId,
    notes: subject ? `From an email: ${subject}` : undefined,
    createdAt: now,
    updatedAt: now,
  };
}
