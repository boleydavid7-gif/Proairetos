import type { Booking } from './model';

/*
 * A flight's status on the day, as the site reads it (worker/flightStatus.ts): times at each airport, terminals, gates,
 * the baggage belt, and the airline's own word for where it stands. Said as facts; what changed since the last look is
 * named so a notice can say it.
 */

export type FlightEnd = { airport?: string; code?: string; scheduled?: string; expected?: string; actual?: string; terminal?: string; gate?: string; desk?: string; belt?: string };
export type FlightStatus = { number: string; airline?: string; status: string; departure: FlightEnd; arrival: FlightEnd; aircraft?: string };

/** "TP 208" from a flight booking's title or notes ("TAP Air Portugal TP 208 · EWR → LIS"). */
export function flightNumberOf(booking: Pick<Booking, 'kind' | 'title' | 'notes'>): string | undefined {
  if (booking.kind !== 'flight') return undefined;
  const match = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4})\b/.exec(`${booking.title} ${booking.notes ?? ''}`);
  return match ? `${match[1]}${match[2]}` : undefined;
}

const WORDS: Record<string, string> = {
  Expected: 'On schedule',
  CheckIn: 'Check-in open',
  Boarding: 'Boarding',
  GateClosed: 'Gate closed',
  Departed: 'Departed',
  EnRoute: 'In the air',
  Delayed: 'Delayed',
  Approaching: 'Landing soon',
  Arrived: 'Landed',
  Canceled: 'Canceled',
  CanceledUncertain: 'May be canceled',
  Diverted: 'Diverted',
};

/** The airline's status in plain words; a later expected time than scheduled reads as delayed. */
export function statusWords(flight: FlightStatus): string {
  const late = minutesLate(flight.departure);
  if (flight.status === 'Expected' && late >= 15) return `Delayed ${lateText(late)}`;
  if (flight.status === 'Delayed' && late > 0) return `Delayed ${lateText(late)}`;
  return WORDS[flight.status] ?? 'No status yet';
}

/** "2026-11-02 18:30-04:00" → minutes since midnight at that airport, and its date. */
function parts(local?: string): { date: string; minutes: number } | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(local ?? '');
  return match ? { date: match[1], minutes: Number(match[2]) * 60 + Number(match[3]) } : undefined;
}

/** Minutes the expected time is after the scheduled one (0 when on time or unknown). */
export function minutesLate(at: FlightEnd): number {
  const planned = parts(at.scheduled);
  const now = parts(at.actual ?? at.expected);
  if (!planned || !now) return 0;
  const days = (Date.parse(now.date) - Date.parse(planned.date)) / 86_400_000;
  return Math.max(0, now.minutes - planned.minutes + days * 1440);
}

const lateText = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`);

/** "6:30 PM" at the airport, from its local time. */
export function clockAt(local?: string): string | undefined {
  const at = parts(local);
  if (!at) return undefined;
  const hours = Math.floor(at.minutes / 60);
  const minutes = at.minutes % 60;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** What changed between two looks, in words: "Gate B52", "Now 7:15 PM", "Canceled". Empty when nothing did. */
export function changes(before: FlightStatus | undefined, after: FlightStatus): string[] {
  if (!before) return [];
  const said: string[] = [];
  if (before.status !== after.status && ['Delayed', 'Canceled', 'CanceledUncertain', 'Diverted', 'Boarding', 'GateClosed'].includes(after.status)) said.push(statusWords(after));
  const was = before.departure.expected ?? before.departure.scheduled;
  const now = after.departure.expected ?? after.departure.scheduled;
  if (now && was && now !== was && after.status !== 'Canceled') said.push(`Now ${clockAt(now)}`);
  if (after.departure.terminal && after.departure.terminal !== before.departure.terminal) said.push(`Terminal ${after.departure.terminal}`);
  if (after.departure.gate && after.departure.gate !== before.departure.gate) said.push(`Gate ${after.departure.gate}`);
  if (after.arrival.belt && after.arrival.belt !== before.arrival.belt) said.push(`Bags at belt ${after.arrival.belt}`);
  return [...new Set(said)];
}
