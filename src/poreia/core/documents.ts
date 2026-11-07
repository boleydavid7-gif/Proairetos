/*
 * Travel documents: passports, visas, insurance and the like, with their numbers and end dates. Kept on the person's
 * own devices (sealed when synced) and never put in a shared trip. A document with a trip belongs to that trip; one
 * without (a passport) shows on every trip.
 */

export type DocKind = 'passport' | 'id' | 'visa' | 'insurance' | 'license' | 'health' | 'ticket' | 'loyalty' | 'other';

export const DOC_KINDS: { id: DocKind; label: string }[] = [
  { id: 'passport', label: 'Passport' },
  { id: 'id', label: 'ID card' },
  { id: 'visa', label: 'Visa or entry permit' },
  { id: 'insurance', label: 'Travel insurance' },
  { id: 'license', label: 'Driving license' },
  { id: 'health', label: 'Health or vaccination' },
  { id: 'ticket', label: 'Ticket or pass' },
  { id: 'loyalty', label: 'Loyalty program' },
  { id: 'other', label: 'Other' },
];

export type TravelDoc = {
  id: string;
  kind: DocKind;
  /** Whose it is, or what it is: "Dana's passport", "Allianz". */
  name: string;
  number?: string;
  /** For insurance: the number to call. */
  phone?: string;
  expires?: string;
  /** Only for this trip; every trip when not set. */
  tripId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const docKindLabel = (kind: DocKind) => DOC_KINDS.find((each) => each.id === kind)?.label ?? 'Document';

/** The documents that go with a trip: its own, and the ones for every trip. */
export const docsFor = (docs: readonly TravelDoc[], tripId: string) => docs.filter((doc) => !doc.tripId || doc.tripId === tripId).sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

/** Whole months from one date to a later one (counted by the calendar, as passport rules count). */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

const monthYear = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

/**
 * A plain fact about a document's end date against a trip: ends before the trip is over, or how long after it ends.
 * Passports also say when under six months are left after coming back, since many countries ask for six.
 */
export function expiryFact(doc: TravelDoc, trip?: { start?: string; end?: string }, today?: string): string | undefined {
  if (!doc.expires) return undefined;
  const back = trip?.end ?? trip?.start;
  if (today && doc.expires < today) return `Ended ${monthYear(doc.expires)}`;
  if (!back) return `Valid until ${monthYear(doc.expires)}`;
  if (doc.expires < back) return `Ends ${monthYear(doc.expires)}, before the trip is over`;
  const months = monthsBetween(back, doc.expires);
  if ((doc.kind === 'passport' || doc.kind === 'id') && months < 6) {
    return `Ends ${monthYear(doc.expires)}, ${months < 1 ? 'under a month' : months === 1 ? '1 month' : `${months} months`} after the trip; many countries ask for six`;
  }
  return `Valid until ${monthYear(doc.expires)}`;
}

/** True when the fact is worth putting first: the document ends before or near the trip. */
export function needsLook(doc: TravelDoc, trip?: { start?: string; end?: string }, today?: string): boolean {
  if (!doc.expires) return false;
  const back = trip?.end ?? trip?.start;
  if (today && doc.expires < today) return true;
  if (!back) return false;
  if (doc.expires < back) return true;
  return (doc.kind === 'passport' || doc.kind === 'id') && monthsBetween(back, doc.expires) < 6;
}

/** A number shown with all but its last four hidden. */
export const masked = (number: string) => (number.length <= 4 ? number : `•••• ${number.slice(-4)}`);

const COMMON = new Set(['air', 'airlines', 'airline', 'airways', 'hotel', 'hotels', 'resorts', 'the', 'and', 'cruise', 'cruises', 'line', 'rail', 'rent', 'car', 'international']);
const wordsOf = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3 && !COMMON.has(word));

/** The person's loyalty numbers that go with a booking: a program whose name shares a word with the provider. */
export function loyaltyFor(all: readonly TravelDoc[], provider?: string): TravelDoc[] {
  if (!provider) return [];
  const words = new Set(wordsOf(provider));
  return all.filter((doc) => doc.kind === 'loyalty' && doc.number && wordsOf(doc.name).some((word) => words.has(word)));
}
