import { useEffect, useState } from 'react';
import { onRemoteChanges } from '../sync/syncController';

/*
 * Swipes on Today's From your apps group. Right is "Not today": the line stays off Today until the person's next day.
 * Left is done: a line its app can mark is marked there; any other line is only done here, for the day. Nothing in the
 * app the line came from changes otherwise, so it comes round there as it always would. Kept as one small synced
 * setting holding only today's keys (and the names of what was set aside); a new day starts empty, so nothing piles up.
 */

export const NOT_TODAY_KEY = 'proairetos.notToday';
const CHANGED = 'proairetos-not-today';

export type NotToday = { day: string; keys: string[]; done?: string[]; titles?: Record<string, string> };
export type TodayMarks = { aside: string[]; done: string[]; titles: Record<string, string> };

/** What was set aside and done on `day`; an older day's lists count as empty. */
export function marksOn(state: NotToday | null | undefined, day: string): TodayMarks {
  return state && state.day === day ? { aside: state.keys, done: state.done ?? [], titles: state.titles ?? {} } : { aside: [], done: [], titles: {} };
}

export const asideOn = (state: NotToday | null | undefined, day: string): string[] => marksOn(state, day).aside;

const fresh = (state: NotToday | null | undefined, day: string): NotToday => {
  const marks = marksOn(state, day);
  return { day, keys: marks.aside, done: marks.done, titles: marks.titles };
};

export function withAside(state: NotToday | null | undefined, day: string, key: string, title?: string): NotToday {
  const next = fresh(state, day);
  return { ...next, keys: next.keys.includes(key) ? next.keys : [...next.keys, key], titles: title ? { ...next.titles, [key]: title } : next.titles };
}

export function withoutAside(state: NotToday | null | undefined, day: string, key: string): NotToday {
  const next = fresh(state, day);
  const titles = { ...next.titles };
  delete titles[key];
  return { ...next, keys: next.keys.filter((each) => each !== key), titles };
}

export function withDone(state: NotToday | null | undefined, day: string, key: string): NotToday {
  const next = fresh(state, day);
  return { ...next, done: next.done!.includes(key) ? next.done : [...next.done!, key] };
}

export function withoutDone(state: NotToday | null | undefined, day: string, key: string): NotToday {
  const next = fresh(state, day);
  return { ...next, done: next.done!.filter((each) => each !== key) };
}

function read(): NotToday | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOT_TODAY_KEY) ?? 'null') as NotToday | null;
    return parsed && typeof parsed.day === 'string' && Array.isArray(parsed.keys) ? parsed : null;
  } catch {
    return null;
  }
}

function write(state: NotToday) {
  try {
    localStorage.setItem(NOT_TODAY_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the line stays for this visit.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export const setAside = (day: string, key: string, title?: string) => write(withAside(read(), day, key, title));
export const bringBack = (day: string, key: string) => write(withoutAside(read(), day, key));
export const doneHere = (day: string, key: string) => write(withDone(read(), day, key));
export const undoDoneHere = (day: string, key: string) => write(withoutDone(read(), day, key));

/** Today's marks, following changes here, in other tabs and from sync. */
export function useTodayMarks(day: string): TodayMarks {
  const [state, setState] = useState(read);
  useEffect(() => {
    const again = () => setState(read());
    const onStorage = (event: StorageEvent) => (event.key === null || event.key === NOT_TODAY_KEY) && again();
    window.addEventListener(CHANGED, again);
    window.addEventListener('storage', onStorage);
    const off = onRemoteChanges(again);
    return () => {
      window.removeEventListener(CHANGED, again);
      window.removeEventListener('storage', onStorage);
      off();
    };
  }, []);
  return marksOn(state, day);
}
