import type { Bill } from './bills';
import type { Envelope } from './envelopes';
import type { Spent } from './statements';

const cell = (value: unknown): string => {
  const text = value === undefined || value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const table = (headers: string[], rows: unknown[][]): string => [headers, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n';

export function billsCsv(bills: readonly Bill[]): string {
  return table(['id', 'name', 'amount', 'currency', 'next_due', 'frequency', 'category', 'autopay', 'reminder_days', 'ended_on', 'payments'], bills.map((bill) => [bill.id, bill.name, (bill.amountCents / 100).toFixed(2), bill.currency, bill.dueDate, bill.frequency, bill.category ?? '', bill.autopay, bill.reminderDays, bill.endedOn ?? '', bill.payments]));
}

export function expensesCsv(lines: readonly Spent[], currency: string): string {
  return table(['id', 'date', 'description', 'amount', 'currency', 'area', 'budget_item_id'], lines.map((line) => [line.id, line.date, line.description, (line.amountCents / 100).toFixed(2), currency, line.area, line.budgetItemId ?? '']));
}

export function envelopesCsv(envelopes: readonly Envelope[]): string {
  return table(['id', 'name', 'currency', 'balance', 'target', 'monthly_contribution', 'target_date', 'entries'], envelopes.map((envelope) => [envelope.id, envelope.name, envelope.currency, (envelope.balanceCents / 100).toFixed(2), (envelope.targetCents / 100).toFixed(2), (envelope.monthlyCents / 100).toFixed(2), envelope.targetDate ?? '', envelope.entries]));
}
