import { isAdded, subscribeAdded } from '../family/added';
import { onRemoteChanges } from '../sync/syncController';
import type { Appointment } from '../../therapeia/core/medicines';
import type { CalendarEvent as DisplayCalendarEvent } from './otherCalendars';

/*
 * Therapeia's visits, read only, as entries in Today and Days ahead (an hour long). Medicines stay in From your
 * apps on Today, never on the calendar. Never in the published calendar.
 */

function visits(): Appointment[] {
  const out: Appointment[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith('therapeia:visit:')) continue;
      try {
        out.push(JSON.parse(localStorage.getItem(key) ?? '') as Appointment);
      } catch {
        // An unreadable record is passed over.
      }
    }
  } catch {
    // Storage blocked: nothing to show.
  }
  return out;
}

export const therapeiaCalendar = {
  subscribe(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith('therapeia:')) && listener();
    window.addEventListener('storage', onStorage);
    const offRemote = onRemoteChanges(listener);
    const offAdded = subscribeAdded(listener);
    return () => {
      window.removeEventListener('storage', onStorage);
      offRemote();
      offAdded();
    };
  },

  async eventsBetween(from: Date, until: Date): Promise<DisplayCalendarEvent[]> {
    if (!isAdded('therapeia')) return [];
    const out: DisplayCalendarEvent[] = [];
    for (const visit of visits()) {
      if (!visit?.at || !visit.with) continue;
      const start = new Date(visit.at.length === 16 ? `${visit.at}:00` : visit.at);
      if (Number.isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + 60 * 60_000);
      if (end <= from || start >= until) continue;
      const title = visit.who ? `${visit.who}: ${visit.with}` : visit.with;
      out.push({ key: `therapeia:${visit.id}`, title, start, end, ...(visit.where ? { location: visit.where } : {}), source: 'Therapeia', sourceId: 'therapeia' });
    }
    return out;
  },
};
