export type BillFrequency = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type BillPayment = {
  id: string;
  date: string;
  amountCents: number;
  note?: string;
};

export type Bill = {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  dueDate: string;
  frequency: BillFrequency;
  category?: string;
  autopay: boolean;
  reminderDays: number;
  notes?: string;
  payments: BillPayment[];
  createdAt: string;
  updatedAt: string;
};

export type BillOccurrence = {
  bill: Bill;
  date: string;
};

const DAY = 86_400_000;

export function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addMonths(value: string, months: number): string {
  const source = parseDate(value);
  const targetMonth = source.getMonth() + months;
  const year = source.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(source.getDate(), daysInMonth(year, month));
  return localDate(new Date(year, month, day, 12));
}

export function advanceDate(value: string, frequency: BillFrequency): string {
  if (frequency === 'weekly') return addDays(value, 7);
  if (frequency === 'monthly') return addMonths(value, 1);
  if (frequency === 'quarterly') return addMonths(value, 3);
  if (frequency === 'yearly') return addMonths(value, 12);
  return value;
}

function occurrenceDate(bill: Bill, index: number): string {
  if (bill.frequency === 'weekly') return addDays(bill.dueDate, index * 7);
  if (bill.frequency === 'monthly') return addMonths(bill.dueDate, index);
  if (bill.frequency === 'quarterly') return addMonths(bill.dueDate, index * 3);
  if (bill.frequency === 'yearly') return addMonths(bill.dueDate, index * 12);
  return bill.dueDate;
}

export function occurrenceOnOrAfter(bill: Bill, from: string): BillOccurrence | undefined {
  for (let i = 0; i < 500; i += 1) {
    const date = occurrenceDate(bill, i);
    if (date >= from) return { bill, date };
    if (bill.frequency === 'once') return undefined;
  }
  return undefined;
}

export function occurrencesBetween(bill: Bill, from: string, until: string): BillOccurrence[] {
  const result: BillOccurrence[] = [];
  for (let i = 0; i < 500; i += 1) {
    const date = occurrenceDate(bill, i);
    if (date > until) break;
    if (date >= from) result.push({ bill, date });
    if (bill.frequency === 'once') break;
  }
  return result;
}

export function nextBills(bills: readonly Bill[], from = localDate(), count = 12): BillOccurrence[] {
  return bills
    .flatMap((bill) => occurrenceOnOrAfter(bill, from) ?? [])
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name))
    .slice(0, count);
}

export function monthBounds(month: Date): { from: string; until: string } {
  const year = month.getFullYear();
  const index = month.getMonth();
  return { from: localDate(new Date(year, index, 1, 12)), until: localDate(new Date(year, index + 1, 0, 12)) };
}

/** The seven-day planning window containing a date, using the chosen first day. */
export function weekBounds(day: string, weekStartsOn = 1): { from: string; until: string } {
  const start = ((Math.trunc(weekStartsOn) % 7) + 7) % 7;
  const offset = (parseDate(day).getDay() - start + 7) % 7;
  const from = addDays(day, -offset);
  return { from, until: addDays(from, 6) };
}

export function monthCells(month: Date): string[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getTime() - mondayOffset * DAY);
  return Array.from({ length: 42 }, (_, index) => localDate(new Date(start.getTime() + index * DAY)));
}

export function formatMoney(amountCents: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amountCents / 100);
}

export function formatDate(value: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(undefined, style === 'long' ? { month: 'long', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' }).format(parseDate(value));
}

export function formatMonth(month: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
}

export function relativeDue(value: string, today = localDate()): string {
  if (value === today) return 'Due today';
  const distance = Math.round((parseDate(value).getTime() - parseDate(today).getTime()) / DAY);
  if (distance === 1) return 'Due tomorrow';
  if (distance > 1) return 'Due in ' + distance + ' days';
  if (distance === -1) return 'Past due yesterday';
  return 'Past due ' + Math.abs(distance) + ' days';
}

export function paidForOccurrence(bill: Bill, date: string): BillPayment | undefined {
  return bill.payments.find((payment) => payment.date === date);
}

export function nextMonth(month: Date, amount: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1, 12);
}

/** How many days before its next date a paid bill comes back into view: its reminder lead, at least a week. */
export function returnWindow(bill: Bill): number {
  return Math.max(bill.reminderDays, 7);
}

export type Standing = {
  /** The date this bill is about now (the one to pay), or the last one it had. */
  date: string;
  /** Paid for that date, and not yet near its next one: it leaves the list until it cycles around. */
  settled: boolean;
  /** When it comes back, if it will. */
  returnsOn?: string;
  /** A one-time bill that is done. */
  complete?: boolean;
};

const DAYS = 86_400_000;

/**
 * Where a bill stands today. A date with a payment recorded is settled; the bill leaves the list and
 * returns once its next date is within `returnWindow` days. Nothing about a bill is ever called late.
 */
export function standing(bill: Bill, today = localDate()): Standing {
  const current = occurrenceOnOrAfter(bill, today);
  if (!current) return { date: bill.dueDate, settled: true, complete: true };
  const window = returnWindow(bill);
  const daysTo = (date: string) => Math.round((parseDate(date).getTime() - parseDate(today).getTime()) / DAYS);
  if (paidForOccurrence(bill, current.date)) {
    // Paid for the coming date: settled until the one after it is near.
    const next = occurrenceOnOrAfter(bill, addDays(current.date, 1));
    if (!next) return { date: current.date, settled: true, complete: true };
    if (daysTo(next.date) <= window && !paidForOccurrence(bill, next.date)) return { date: next.date, settled: false };
    return { date: current.date, settled: true, returnsOn: addDays(next.date, -window) };
  }
  // Paid for the date just gone, and the coming one is still far off: it stays away until it cycles around.
  const before = occurrenceBefore(bill, current.date);
  if (before && paidForOccurrence(bill, before) && daysTo(current.date) > window) {
    return { date: before, settled: true, returnsOn: addDays(current.date, -window) };
  }
  return { date: current.date, settled: false };
}

/** The date of the bill's turn just before `date`, if it had one. */
function occurrenceBefore(bill: Bill, date: string): string | undefined {
  let last: string | undefined;
  for (let i = 0; i < 500; i += 1) {
    const day = occurrenceDate(bill, i);
    if (day >= date) break;
    last = day;
    if (bill.frequency === 'once') break;
  }
  return last;
}

/** The bill with a payment recorded for `date` (replacing one already there). Pure; saving is up to the caller. */
export function withPayment(bill: Bill, date: string, id: string, now = new Date()): Bill {
  const existing = bill.payments.find((payment) => payment.date === date);
  const payment = { id: existing?.id ?? id, date, amountCents: bill.amountCents, note: existing?.note };
  return { ...bill, payments: [...bill.payments.filter((item) => item.date !== date), payment], updatedAt: now.toISOString() };
}

/** What a set of bill dates adds up to, one amount per currency. */
export function totalsOf(occurrences: readonly BillOccurrence[]): { currency: string; cents: number }[] {
  const sums = new Map<string, number>();
  for (const { bill } of occurrences) sums.set(bill.currency, (sums.get(bill.currency) ?? 0) + bill.amountCents);
  return [...sums].map(([currency, cents]) => ({ currency, cents }));
}

export function formatTotals(occurrences: readonly BillOccurrence[]): string {
  return totalsOf(occurrences)
    .map(({ currency, cents }) => formatMoney(cents, currency))
    .join(' + ');
}

/** The dates in a set that have no payment recorded yet. */
export const stillToCome = (occurrences: readonly BillOccurrence[]): BillOccurrence[] =>
  occurrences.filter(({ bill, date }) => !paidForOccurrence(bill, date));

/** What is left to pay, and the whole, for a set of bill dates, as text. */
export function remainingSummary(occurrences: readonly BillOccurrence[]): { main: string; note: string } {
  const open = stillToCome(occurrences);
  const whole = formatTotals(occurrences);
  if (occurrences.length === 0) return { main: '', note: '' };
  if (open.length === 0) return { main: whole, note: 'all paid' };
  if (open.length === occurrences.length) return { main: whole, note: 'left to pay' };
  return { main: formatTotals(open), note: `left to pay, of ${whole}` };
}
