import { addDays, formatMoney, occurrencesBetween, paidForOccurrence, parseDate, type Bill } from '../../oikonomia/core/bills';
import type { Drink } from '../../hydros/core/drinks';
import type { TheoriaBook } from '../../theoria/core/books';

/**
 * Quiet facts from the other apps for Today, worked out from their own records. Only what was recorded:
 * a bill's date, what was drunk, the book being read. Nothing is scored, compared or advised.
 */
export type BillSoon = { id: string; name: string; date: string; when: string };

const DAY = 86_400_000;

/** Bills with a date from today through the next few days that have no payment recorded for that date. */
export function billsSoon(bills: readonly Bill[], today: string, days = 3): BillSoon[] {
  const last = addDays(today, days);
  return bills
    .flatMap((bill) => occurrencesBetween(bill, today, last).filter((occurrence) => !paidForOccurrence(bill, occurrence.date)))
    .map(({ bill, date }) => {
      const gap = Math.round((parseDate(date).getTime() - parseDate(today).getTime()) / DAY);
      return { id: bill.id, name: bill.name, date, when: gap === 0 ? 'today' : gap === 1 ? 'tomorrow' : `in ${gap} days` };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Ounces drunk on the local day `today`. */
export function ouncesToday(drinks: readonly Pick<Drink, 'amountOz' | 'loggedAt'>[], today: string): number {
  return drinks.filter((drink) => dayOf(drink.loggedAt) === today).reduce((sum, drink) => sum + drink.amountOz, 0);
}

/** The book being read that was touched most recently, if any. */
export function bookInProgress(books: readonly TheoriaBook[]): TheoriaBook | undefined {
  return books.filter((book) => book.status === 'reading').sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))[0];
}

export type BillOnDay = { id: string; name: string; amount: string; paid: boolean };

/** The bills with a date on one day, for the calendar. Read only; paid ones are marked, not hidden. */
export function billsOn(bills: readonly Bill[], date: string): BillOnDay[] {
  return bills
    .flatMap((bill) => occurrencesBetween(bill, date, date).map((occurrence) => ({ bill, occurrence })))
    .map(({ bill, occurrence }) => ({
      id: bill.id,
      name: bill.name,
      amount: formatMoney(bill.amountCents, bill.currency),
      paid: Boolean(paidForOccurrence(bill, occurrence.date)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
