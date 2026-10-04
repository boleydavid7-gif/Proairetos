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
