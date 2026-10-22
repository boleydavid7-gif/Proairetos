import { isAdded, subscribeAdded } from '../family/added';
import { onRemoteChanges } from '../sync/syncController';
import type { Person } from '../../philia/core/people';
import type { CalendarEvent as DisplayCalendarEvent } from './otherCalendars';

/*
 * Philia's events that have a time, read only, as entries in Today and Days ahead (an hour long). Dates without a
 * time stay quiet lines under their day (`birthdaysOn` in `app/family/glance.ts`). Never in the published calendar.
 */

function people(): Person[] {
  const out: Person[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith('philia:person:')) continue;
      try {
        out.push(JSON.parse(localStorage.getItem(key) ?? '') as Person);
      } catch {
        // An unreadable record is passed over.
      }
    }
  } catch {
    // Storage blocked: nothing to show.
  }
  return out;
}

export const philiaCalendar = {
  subscribe(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith('philia:')) && listener();
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
    if (!isAdded('philia')) return [];
    const out: DisplayCalendarEvent[] = [];
    for (const person of people()) {
      for (const each of person.dates ?? []) {
        if (!each.once || !each.time) continue;
        const start = new Date(`${each.date}T${each.time}:00`);
        const end = new Date(start.getTime() + 60 * 60_000);
        if (end <= from || start >= until) continue;
        out.push({ key: `philia:${person.id}:${each.id}`, title: `${each.label || 'Event'} · ${person.name}`, start, end, source: 'Philia', sourceId: 'philia' });
      }
    }
    return out;
  },
};
