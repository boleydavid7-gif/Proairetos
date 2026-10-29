import { useEffect, useState } from 'react';
import { onRemoteChanges } from '../sync/syncController';

/*
 * "Not today" on Today's From your apps: rows set aside stay off Today until the person's next day. Nothing in the
 * app the row came from changes, so the thing comes round there as it always would. Kept as one small synced setting
 * holding only today's keys; a new day starts empty, so nothing piles up.
 */

export const NOT_TODAY_KEY = 'proairetos.notToday';
const CHANGED = 'proairetos-not-today';

export type NotToday = { day: string; keys: string[] };

/** The keys set aside on `day`; an older day's list counts as empty. */
export function asideOn(state: NotToday | null | undefined, day: string): string[] {
  return state && state.day === day ? state.keys : [];
}

export function withAside(state: NotToday | null | undefined, day: string, key: string): NotToday {
  const keys = asideOn(state, day);
  return { day, keys: keys.includes(key) ? keys : [...keys, key] };
}

export function withoutAside(state: NotToday | null | undefined, day: string, key: string): NotToday {
  return { day, keys: asideOn(state, day).filter((each) => each !== key) };
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
    // Storage full or blocked: the row stays for this visit.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export const setAside = (day: string, key: string) => write(withAside(read(), day, key));
export const bringBack = (day: string, key: string) => write(withoutAside(read(), day, key));

/** Today's set-aside keys, following changes here, in other tabs and from sync. */
export function useNotToday(day: string): string[] {
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
  return asideOn(state, day);
}
