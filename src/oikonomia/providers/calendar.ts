import { rangeDays, type CalendarLine, type Provider } from '../../core/providers';
import { occurrencesBetween, paidForOccurrence, type Bill } from '../core/bills';

/*
 * Each bill's due dates inside the range: the name, the day and whether a payment is recorded for it. Never an amount, a
 * currency, an account, a payment, a note or a bill type (manifest, oikonomia.calendar). The bill stays in Oikonomia,
 * which shows what it comes to; the line opens it there. A bill that repeats is expanded only inside the range.
 */
export const oikonomiaCalendar: Provider<'calendar'> = {
  app: 'oikonomia',
  capability: 'calendar',
  version: 1,
  privacy: 'own-search',
  sources: ['oikonomiaBills'],
  async read(ctx) {
    const range = ctx.range;
    if (!range) return [];
    const { first, last } = rangeDays(range);
    const lines: CalendarLine[] = [];
    for (const bill of await ctx.records<Bill>('oikonomiaBills')) {
      if (typeof bill?.id !== 'string' || !Array.isArray(bill.payments)) continue;
      for (const { date } of occurrencesBetween(bill, first, last)) {
        lines.push({
          ref: { app: 'oikonomia', kind: 'bill', id: bill.id, occurrence: date },
          kind: 'deadline',
          title: bill.name,
          open: `/oikonomia/?open=bill:${encodeURIComponent(bill.id)}`,
          day: date,
          done: Boolean(paidForOccurrence(bill, date, ctx.today)),
          color: 'amber',
        });
      }
    }
    return lines.sort((a, b) => a.day.localeCompare(b.day) || a.title.localeCompare(b.title));
  },
  // Bills are edited in Oikonomia's own window; coming back into view reads them again, as Days ahead always did.
  subscribe(listener) {
    if (typeof document === 'undefined') return () => undefined;
    const onShow = () => document.visibilityState === 'visible' && listener();
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  },
};
