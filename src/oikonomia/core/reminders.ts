import { addDays, formatMoney, occurrencesBetween, paidForOccurrence, parseDate, type Bill } from './bills';

/** One bill reminder: the morning of the day the person chose (their lead before the date). */
export type BillReminder = { key: string; day: string; billId: string; title: string; body: string };

const LONGEST_LEAD = 31;

/**
 * The reminders the person asked for on their bills, for days from `from` through `until`. A date already
 * paid sends none. Says what and when, nothing more.
 */
export function billReminders(bills: readonly Bill[], from: string, until: string): BillReminder[] {
  const out: BillReminder[] = [];
  for (const bill of bills) {
    const lead = Math.min(LONGEST_LEAD, Math.max(0, Math.round(bill.reminderDays) || 0));
    for (const { date } of occurrencesBetween(bill, from, addDays(until, lead))) {
      const day = addDays(date, -lead);
      if (day < from || day > until) continue;
      if (paidForOccurrence(bill, date, day)) continue;
      const when =
        lead === 0
          ? 'Due today'
          : 'Due ' + new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(parseDate(date));
      out.push({
        key: `${bill.id}:${date}:${lead}`,
        day,
        billId: bill.id,
        title: `${bill.name} · ${formatMoney(bill.amountCents, bill.currency)}`,
        body: bill.autopay ? `${when} · paid automatically` : when,
      });
    }
  }
  return out;
}
