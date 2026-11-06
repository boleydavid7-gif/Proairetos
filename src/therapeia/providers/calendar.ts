import { watchLocal } from '../../app/family/localChanges';
import type { CalendarLine, Provider } from '../../core/providers';
import type { Appointment } from '../core/medicines';

/*
 * Visits with a time, an hour long, as entries in the calendar: the contact (and who it is for), the time and the place.
 * Never visit notes, questions, medicines, doses, readings or the health card (manifest, therapeia.calendar). Medicines
 * stay out of the calendar. The visit stays in Therapeia; the line opens it there.
 */
export const therapeiaCalendar: Provider<'calendar'> = {
  app: 'therapeia',
  capability: 'calendar',
  version: 1,
  privacy: 'own-search',
  sources: ['local:therapeia:visit:'],
  async read(ctx) {
    const range = ctx.range;
    if (!range) return [];
    const lines: CalendarLine[] = [];
    for (const visit of await ctx.records<Appointment>('local:therapeia:visit:')) {
      if (!visit?.at || !visit.with || typeof visit.id !== 'string') continue;
      const start = new Date(visit.at.length === 16 ? `${visit.at}:00` : visit.at);
      if (Number.isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + 60 * 60_000);
      if (end <= range.from || start >= range.until) continue;
      lines.push({
        ref: { app: 'therapeia', kind: 'visit', id: visit.id },
        kind: 'event',
        title: visit.who ? `${visit.who}: ${visit.with}` : visit.with,
        open: `/therapeia/?open=${encodeURIComponent(`visit:${visit.id}`)}`,
        day: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
        start,
        end,
        ...(visit.where ? { location: visit.where } : {}),
      });
    }
    return lines;
  },
  subscribe: (listener) => watchLocal('therapeia:visit:', listener),
};
