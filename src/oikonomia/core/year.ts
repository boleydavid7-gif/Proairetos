import { countText, facts, inYear, type Year } from '../../core/year/year';
import { formatMoney, type Bill } from './bills';
import { budgetCategories } from './budget';
import type { Spent } from './statements';

/** Sums by currency, written together: "$1,240.00 · €80.00". */
function moneyText(amounts: readonly { cents: number; currency: string }[]): string | undefined {
  const by = new Map<string, number>();
  for (const each of amounts) by.set(each.currency, (by.get(each.currency) ?? 0) + each.cents);
  const parts = [...by].filter(([, cents]) => cents > 0).map(([currency, cents]) => formatMoney(cents, currency));
  return parts.length ? parts.join(' · ') : undefined;
}

/**
 * Money in a year as it was written down: bill payments recorded (autopay dates are not stored, so they are left
 * out), and what was brought in from statements, by area.
 */
export function oikonomiaYear(bills: readonly Bill[], spent: readonly Spent[], currency: string, year: number): Year {
  const payments = bills.flatMap((bill) => bill.payments.filter((payment) => inYear(payment.date, year)).map((payment) => ({ bill, payment })));
  const lines = spent.filter((line) => inYear(line.date, year));
  const byBill = new Map<Bill, number>();
  for (const { bill, payment } of payments) byBill.set(bill, (byBill.get(bill) ?? 0) + payment.amountCents);
  const byArea = new Map<string, number>();
  for (const line of lines) {
    const area = budgetCategories.find((each) => each.id === line.area)?.label ?? 'Other';
    byArea.set(area, (byArea.get(area) ?? 0) + line.amountCents);
  }
  return {
    facts: facts(
      ['Payments recorded', payments.length > 0 && countText(payments.length)],
      ['Paid on bills', moneyText(payments.map(({ bill, payment }) => ({ cents: payment.amountCents, currency: bill.currency })))],
      ['Spent, from statements', moneyText(lines.map((line) => ({ cents: line.amountCents, currency })))],
    ),
    lists: [
      { title: 'Each bill', lines: [...byBill].sort((a, b) => a[0].name.localeCompare(b[0].name)).map(([bill, cents]) => `${bill.name}: ${formatMoney(cents, bill.currency)}`) },
      { title: 'Spent by area', lines: [...byArea].sort((a, b) => b[1] - a[1]).map(([area, cents]) => `${area}: ${formatMoney(cents, currency)}`) },
    ].filter((list) => list.lines.length),
  };
}
