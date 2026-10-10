import { useSyncExternalStore } from 'react';
import type { BudgetCategory } from '../core/budget';
import { merchantKey, type Spent } from '../core/statements';

/*
 * What was spent, from statements, one setting per month (`oikonomia:spent:YYYY-MM`), so it goes with backups
 * and (sealed) to the person's other devices like any setting. The person's moves of a shop to an area are kept
 * in `oikonomia:areaChoices` and used for the next statement.
 */
const monthKeyOf = (month: string) => `oikonomia:spent:${month}`;
const CHOICES = 'oikonomia:areaChoices';
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; lines: Spent[] }>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function notify() {
  for (const listener of listeners) listener();
}

export function spentIn(month: string): Spent[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(monthKeyOf(month));
  } catch {
    return [];
  }
  const kept = cache.get(month);
  if (kept && kept.raw === raw) return kept.lines;
  let lines: Spent[] = [];
  try {
    lines = raw ? (JSON.parse(raw) as Spent[]) : [];
  } catch {
    lines = [];
  }
  cache.set(month, { raw, lines });
  return lines;
}

export function saveSpent(month: string, lines: Spent[]): void {
  try {
    if (lines.length) localStorage.setItem(monthKeyOf(month), JSON.stringify([...lines].sort((a, b) => a.date.localeCompare(b.date))));
    else localStorage.removeItem(monthKeyOf(month));
  } catch {
    // Storage full: shown until the page closes.
  }
  notify();
}

/** Every month that has lines kept, newest first. */
export function monthsWithSpent(): string[] {
  const months: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('oikonomia:spent:')) months.push(key.slice('oikonomia:spent:'.length));
    }
  } catch {
    return [];
  }
  return months.sort().reverse();
}

export const areaChoices = () => read<Record<string, BudgetCategory>>(CHOICES, {});
export function rememberArea(description: string, area: BudgetCategory): void {
  try {
    localStorage.setItem(CHOICES, JSON.stringify({ ...areaChoices(), [merchantKey(description)]: area }));
  } catch {
    // Not remembered this time.
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key?.startsWith('oikonomia:spent:') && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};
export const useSpent = (month: string) => useSyncExternalStore(subscribe, () => spentIn(month));
