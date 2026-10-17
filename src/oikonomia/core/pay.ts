import { addDays, addMonths, occurrencesBetween, paidForOccurrence, parseDate, type Bill, type BillOccurrence } from './bills';

/**
 * When pay comes in, and what is due before it. The person says how they are paid; Oikonomia lays the dates out and
 * adds up the bills that fall before each one. Facts only: nothing is judged or suggested.
 */
export type PayRhythm = 'weekly' | 'every-2-weeks' | 'twice-monthly' | 'monthly';

export type Pay = {
  id: string;
  name: string;
  /** Usually about this much, if the person says (cents). */
  amountCents?: number;
  currency: string;
  rhythm: PayRhythm;
  /** One known pay date; the others follow from it. Twice monthly uses its day and `secondDay`. */
  date: string;
  /** For twice monthly: the other day of the month (31 = the month's last day). */
  secondDay?: number;
};

/** What is in the account, as the person last said, and when. */
export type Balance = { cents: number; currency: string; on: string };

export const RHYTHMS: { id: PayRhythm; label: string }[] = [
  { id: 'weekly', label: 'Every week' },
  { id: 'every-2-weeks', label: 'Every two weeks' },
  { id: 'twice-monthly', label: 'Twice a month' },
  { id: 'monthly', label: 'Every month' },
];

const lastDay = (year: number, month: number) => new Date(year, month + 1, 0, 12).getDate();
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Every pay date of one income from `from` to `until`, inclusive. */
export function payDates(pay: Pay, from: string, until: string): string[] {
  const out: string[] = [];
  if (pay.rhythm === 'weekly' || pay.rhythm === 'every-2-weeks') {
    const step = pay.rhythm === 'weekly' ? 7 : 14;
    // Back from the known date to on or before `from`, then forward.
    const gap = Math.floor((parseDate(from).getTime() - parseDate(pay.date).getTime()) / 86_400_000);
    let date = addDays(pay.date, Math.floor(gap / step) * step);
    while (date < from) date = addDays(date, step);
    for (; date <= until && out.length < 200; date = addDays(date, step)) out.push(date);
    return out;
  }
  const days = pay.rhythm === 'twice-monthly' ? [parseDate(pay.date).getDate(), pay.secondDay ?? 15] : [parseDate(pay.date).getDate()];
  const start = parseDate(from);
  for (let m = 0; m < 30; m += 1) {
    const year = start.getFullYear();
    const month = start.getMonth() + m;
    const first = new Date(year, month, 1, 12);
    for (const day of days) {
      const date = iso(new Date(first.getFullYear(), first.getMonth(), Math.min(day, lastDay(first.getFullYear(), first.getMonth())), 12));
      if (date >= from && date <= until && !out.includes(date)) out.push(date);
    }
    if (iso(first) > until) break;
  }
  return out.sort();
}

/** The next pay date on or after today, across every income; with the incomes paid that day. */
export function nextPay(pays: readonly Pay[], today: string): { date: string; pays: Pay[] } | undefined {
  const until = addMonths(today, 2);
  const all = pays.flatMap((pay) => payDates(pay, today, until).map((date) => ({ date, pay })));
  if (!all.length) return undefined;
  const date = all.map((each) => each.date).sort()[0];
  return { date, pays: all.filter((each) => each.date === date).map((each) => each.pay) };
}

/** Bills due from `from` up to the day before `until`, not yet paid. */
export function billsBefore(bills: readonly Bill[], from: string, until: string, today: string): BillOccurrence[] {
  return bills
    .flatMap((bill) => occurrencesBetween(bill, from, addDays(until, -1)))
    .filter((occurrence) => !paidForOccurrence(occurrence.bill, occurrence.date, today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name));
}

export type PayView = {
  next: string;
  days: number;
  pays: Pay[];
  /** Bills before the next pay date, not yet paid. */
  before: BillOccurrence[];
  beforeCents: number;
  /** From what the person said is in the account, after those bills. Only when it was said for today. */
  leftCents?: number;
  /** The pay after next, and the bills between them. */
  following?: { date: string; incomeCents?: number; billsCents: number; count: number };
};

const sum = (occurrences: readonly BillOccurrence[], currency: string) =>
  occurrences.filter((each) => each.bill.currency === currency).reduce((total, each) => total + each.bill.amountCents, 0);

export function payView(pays: readonly Pay[], bills: readonly Bill[], today: string, currency: string, balance?: Balance): PayView | undefined {
  const next = nextPay(pays, today);
  if (!next) return undefined;
  const before = billsBefore(bills, today, next.date, today);
  const beforeCents = sum(before, currency);
  const after = nextPay(pays, addDays(next.date, 1));
  const between = after ? billsBefore(bills, next.date, after.date, today) : [];
  const income = next.pays.every((pay) => pay.amountCents !== undefined) ? next.pays.reduce((total, pay) => total + (pay.amountCents ?? 0), 0) : undefined;
  return {
    next: next.date,
    days: Math.round((parseDate(next.date).getTime() - parseDate(today).getTime()) / 86_400_000),
    pays: next.pays,
    before,
    beforeCents,
    leftCents: balance && balance.on === today && balance.currency === currency ? balance.cents - beforeCents : undefined,
    following: after ? { date: after.date, incomeCents: income, billsCents: sum(between, currency), count: between.length } : undefined,
  };
}
