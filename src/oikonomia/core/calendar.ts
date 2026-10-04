import { buildIcs } from '../../core/calendar/ics';
import { addDays, formatMoney, localDate, occurrencesBetween, type Bill } from './bills';

export function billCalendarEvents(bills: readonly Bill[], from: string, until: string) {
  return bills.flatMap((bill) =>
    occurrencesBetween(bill, from, until).map((occurrence) => ({
      uid: 'oikonomia-' + bill.id + '-' + occurrence.date,
      title: bill.name + ' · ' + formatMoney(bill.amountCents, bill.currency),
      date: occurrence.date,
    })),
  );
}

export function billCalendarText(bills: readonly Bill[], from = localDate()): string {
  const until = addDays(from, 365);
  const events = billCalendarEvents(bills, from, until);
  return buildIcs(events, { name: 'Oikonomia', now: new Date() });
}

export function downloadBillCalendar(bills: readonly Bill[]): void {
  const text = billCalendarText(bills);
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'oikonomia-bills.ics';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
