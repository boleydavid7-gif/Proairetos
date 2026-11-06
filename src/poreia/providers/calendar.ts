import { watchLocal } from '../../app/family/localChanges';
import { localDayOf, type CalendarLine, type Provider } from '../../core/providers';
import { poreiaEvents } from '../core/calendar';
import type { Booking, PlanItem, Trip } from '../core/model';
import type { TimeOff } from '../core/timeOff';

const open = (what: string) => `/poreia/?open=${encodeURIComponent(what)}`;

/*
 * Trips and time off as spans of days, and bookings and plans that have a time as entries at that time, worked out by the
 * same `poreiaEvents` the published calendar uses. Never a confirmation code, a note, a document, spending or a loyalty
 * number (manifest, poreia.calendar): the events carry notes for the published file and none of it is passed on here.
 * The trip stays in Poreia; a line opens it, the booking or the plan there.
 */
const KINDS = /^poreia-(trip|off|booking|plan)-(.+)$/;

export const poreiaCalendar: Provider<'calendar'> = {
  app: 'poreia',
  capability: 'calendar',
  version: 1,
  privacy: 'own-search',
  sources: ['local:poreia:trip:', 'local:poreia:off:', 'local:poreia:booking:', 'local:poreia:plan:'],
  async read(ctx) {
    const range = ctx.range;
    if (!range) return [];
    const [trips, offs, bookings, plans] = await Promise.all([
      ctx.records<Trip>('local:poreia:trip:'),
      ctx.records<TimeOff>('local:poreia:off:'),
      ctx.records<Booking>('local:poreia:booking:'),
      ctx.records<PlanItem>('local:poreia:plan:'),
    ]);
    const lines: CalendarLine[] = [];
    for (const event of poreiaEvents(trips, offs, bookings, range.from, range.until, plans)) {
      const found = KINDS.exec(event.uid);
      if (!found) continue;
      const [, kind, id] = found;
      const where = event.location ? { location: event.location } : {};
      const href = kind === 'trip' ? open(`trip:${id}`) : kind === 'booking' ? open(`booked:${id}`) : kind === 'plan' ? open(`plan:${id}`) : open('time');
      if (event.date) {
        lines.push({ ref: { app: 'poreia', kind, id }, kind: 'info', title: event.title, open: href, day: event.date, until: event.dateEnd ?? nextDay(event.date), ...where });
      } else if (event.start && event.end) {
        lines.push({ ref: { app: 'poreia', kind, id }, kind: 'event', title: event.title, open: href, day: localDayOf(event.start), start: event.start, end: event.end, ...where });
      }
    }
    return lines;
  },
  subscribe: (listener) => watchLocal('poreia:', listener),
};

function nextDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return localDayOf(new Date(year, month - 1, day + 1, 12));
}
