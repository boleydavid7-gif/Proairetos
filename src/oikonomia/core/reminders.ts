import type { Notice } from '../../core/notify/notices';
import { atTime } from '../../core/scheduling/dates';
import { addDays, occurrencesBetween, paidForOccurrence, parseDate, type Bill } from './bills';

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
      let day = addDays(date, -lead);
      // Added or changed after its lead day: reminded on the day itself instead of not at all.
      if (day < from && date >= from) day = date;
      if (day < from || day > until) continue;
      if (paidForOccurrence(bill, date, day)) continue;
      const when =
        day === date
          ? 'Due today'
          : 'Due ' + new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(parseDate(date));
      out.push({
        key: `${bill.id}:${date}:${day === date ? 0 : lead}`,
        day,
        billId: bill.id,
        // The name and the due wording only. An amount stays in the app: never in a title, body or preview.
        title: bill.name,
        body: bill.autopay ? `${when} · paid automatically` : when,
      });
    }
  }
  return out;
}

/** The notice for a reminder, as the notices page and the lock screen word it: the morning of its day. */
export function billNotice(reminder: BillReminder): Notice {
  return { key: `bill:${reminder.key}`, kind: 'bill', at: atTime(reminder.day, '09:00'), title: reminder.title, body: reminder.body, open: `oikonomia:bill:${reminder.billId}` };
}
