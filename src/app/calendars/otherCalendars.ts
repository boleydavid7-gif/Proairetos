import { apiUrl } from '../apiBase';
import type { TagColor } from '../../core/look/tagColors';
import type { ExternalEvent } from '../../core/calendar/readIcs';
import { createListeners } from '../../services/listeners';
import { toLocalDate } from '../../core/scheduling/dates';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

/**
 * Calendars the person reads from elsewhere (Google, Apple, Outlook, or a
 * file). Read-only and kept on this device only: links and events are
 * never uploaded or synced, and nothing here writes back to them. A person
 * can dismiss an imported event locally; that dismissal never alters the
 * source calendar.
 */
export type CalendarSource = {
  id: string;
  name: string;
  /** A subscription link; absent for a one-time file import. */
  url?: string;
  shown: boolean;
  /**
   * How the calendar's timed events count, as the person chose: only shown;
   * as work and commitments (a late one carries the day, like a night
   * shift); or as protected time (reminders wait until it ends).
   */
  role?: CalendarRole;
  /** A colour the person gave it, for the days-ahead view. */
  color?: TagColor;
  refreshedAt?: string;
  error?: string;
};

export type CalendarRole = 'show' | 'commitment' | 'protected';

type StoredEvent = Omit<ExternalEvent, 'start' | 'end'> & { start: string; end: string };
export type CalendarEvent = ExternalEvent & { source: string; sourceId: string };

const SOURCES_KEY = 'proairetos.otherCalendars';
const eventsKey = (id: string) => `proairetos.otherCalendars.${id}`;
const removedEventsKey = (id: string) => `proairetos.otherCalendars.${id}.removed`;
const DAY = 86_400_000;
/** Links refresh at most hourly; files keep a longer window since they never refresh. */
const REFRESH_MS = 60 * 60_000;
const LINK_WINDOW = { back: 14, ahead: 120 };
const FILE_WINDOW = { back: 30, ahead: 400 };

const listeners = createListeners();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the calendar still shows this visit.
  }
}

export function calendarSources(): CalendarSource[] {
  return read<CalendarSource[]>(SOURCES_KEY, []);
}

function saveSources(sources: CalendarSource[]) {
  write(SOURCES_KEY, sources);
  listeners.notify();
}

function updateSource(id: string, changes: Partial<CalendarSource>) {
  saveSources(calendarSources().map((source) => (source.id === id ? { ...source, ...changes } : source)));
}

function removedEventKeys(id: string): string[] {
  return read<string[]>(removedEventsKey(id), []);
}

async function parse(text: string, window: { back: number; ahead: number }): Promise<StoredEvent[]> {
  // The calendar reader loads only when someone uses this.
  const { readIcs } = await import('../../core/calendar/readIcs');
  const now = Date.now();
  return readIcs(text, { start: new Date(now - window.back * DAY), end: new Date(now + window.ahead * DAY) }).map((event) => ({
    ...event,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
  }));
}

/** Gets a calendar file: directly if the service allows it, otherwise through the site's calendar bridge. */
async function fetchCalendar(url: string): Promise<string> {
  const https = url.trim().replace(/^webcals?:\/\//i, 'https://');
  try {
    const direct = await fetch(https, { headers: { accept: 'text/calendar' } });
    if (direct.ok) {
      const text = await direct.text();
      if (/BEGIN:VCALENDAR/i.test(text.slice(0, 2000))) return text;
    }
  } catch {
    // Usually blocked by the service for web pages; the bridge handles it.
  }
  const bridged = await fetch(apiUrl(`/api/calendar?url=${encodeURIComponent(https)}`));
  const text = await bridged.text();
  if (!bridged.ok) throw new Error(text || 'The calendar could not be read.');
  return text;
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const otherCalendars = {
  subscribe: listeners.subscribe,

  async addLink(name: string, url: string): Promise<CalendarSource> {
    const events = await parse(await fetchCalendar(url), LINK_WINDOW);
    const source: CalendarSource = { id: newId(), name: name.trim() || 'Calendar', url: url.trim(), shown: true, refreshedAt: new Date().toISOString() };
    write(eventsKey(source.id), events);
    saveSources([...calendarSources(), source]);
    return source;
  },

  async addFile(name: string, text: string): Promise<CalendarSource> {
    const events = await parse(text, FILE_WINDOW);
    const source: CalendarSource = { id: newId(), name: name.trim() || 'Imported calendar', shown: true, refreshedAt: new Date().toISOString() };
    write(eventsKey(source.id), events);
    saveSources([...calendarSources(), source]);
    return source;
  },

  /** Refreshes linked calendars that are an hour or more old (or all, when asked). Errors are kept, not thrown. */
  async refresh(force = false): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    for (const source of calendarSources()) {
      if (!source.url) continue;
      const age = source.refreshedAt ? Date.now() - new Date(source.refreshedAt).getTime() : Infinity;
      if (!force && age < REFRESH_MS) continue;
      try {
        write(eventsKey(source.id), await parse(await fetchCalendar(source.url), LINK_WINDOW));
        updateSource(source.id, { refreshedAt: new Date().toISOString(), error: undefined });
      } catch (cause) {
        updateSource(source.id, { error: cause instanceof Error ? cause.message : 'Could not refresh.' });
      }
    }
  },

  setShown(id: string, shown: boolean) {
    updateSource(id, { shown });
  },

  setRole(id: string, role: CalendarRole) {
    updateSource(id, { role });
  },

  setColor(id: string, color: TagColor | undefined) {
    updateSource(id, { color });
  },

  /** Hides one imported occurrence on this device, with an undo for the row. */
  removeEvent(sourceId: string, eventKey: string): { undo: () => Promise<void> } {
    const before = removedEventKeys(sourceId);
    const wasRemoved = before.includes(eventKey);
    if (!wasRemoved) {
      write(removedEventsKey(sourceId), [...before, eventKey]);
      listeners.notify();
    }
    let undone = false;
    return {
      undo: async () => {
        if (undone || wasRemoved) return;
        undone = true;
        write(removedEventsKey(sourceId), removedEventKeys(sourceId).filter((key) => key !== eventKey));
        listeners.notify();
      },
    };
  },

  /**
   * Timed events from calendars the person set to count, shaped like
   * schedule blocks, so the day's turnover, closing the day, and quiet
   * hours treat them the same way. All-day events never count.
   */
  blocksBetween(start: Date, end: Date): ScheduleOccurrence[] {
    const roles = new Map(calendarSources().map((source) => [source.id, source.role ?? 'show']));
    return this.eventsBetween(start, end)
      .filter((event) => !event.allDay && roles.get(event.sourceId) !== 'show')
      .map((event) => ({
        patternId: `calendar:${event.sourceId}`,
        patternName: event.source,
        kind: roles.get(event.sourceId) === 'protected' ? ('PROTECTED' as const) : ('COMMITTED' as const),
        label: event.title,
        date: toLocalDate(event.start),
        start: event.start,
        end: event.end,
        changed: false,
      }));
  },

  /** Removes a calendar from this device, with an undo that puts it back as it was. */
  remove(id: string): { undo: () => Promise<void> } {
    const source = calendarSources().find((s) => s.id === id);
    const events = read<StoredEvent[]>(eventsKey(id), []);
    const removed = removedEventKeys(id);
    saveSources(calendarSources().filter((s) => s.id !== id));
    write(eventsKey(id), null);
    write(removedEventsKey(id), null);
    return {
      undo: async () => {
        if (!source || calendarSources().some((s) => s.id === id)) return;
        write(eventsKey(id), events);
        if (removed.length > 0) write(removedEventsKey(id), removed);
        saveSources([...calendarSources(), source]);
      },
    };
  },

  /** Events from shown calendars that overlap the range, in time order. */
  eventsBetween(start: Date, end: Date): CalendarEvent[] {
    return calendarSources()
      .filter((source) => source.shown)
      .flatMap((source) =>
        read<StoredEvent[]>(eventsKey(source.id), [])
          .filter((event) => !removedEventKeys(source.id).includes(event.key))
          .map((event) => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
            source: source.name,
            sourceId: source.id,
          })),
      )
      .filter((event) => event.start < end && event.end > start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  },
};
