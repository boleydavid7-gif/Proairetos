import { useSyncExternalStore } from 'react';
import type { FoodChoices } from '../core/nutrition';

// What the person told Soma about lines it could not read. Kept with Soma's settings (backed up, synced).
const KEY = 'soma:foodChoices';
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: FoodChoices } = { raw: null, value: {} };

export function loadFoodChoices(): FoodChoices {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.value;
  }
  if (raw === cache.raw) return cache.value;
  let value: FoodChoices = {};
  try {
    value = raw ? (JSON.parse(raw) as FoodChoices) : {};
  } catch {
    value = {};
  }
  cache = { raw, value };
  return value;
}

export function saveFoodChoices(next: FoodChoices): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the choice lasts for this visit only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export const useFoodChoices = () => useSyncExternalStore(subscribe, loadFoodChoices);
