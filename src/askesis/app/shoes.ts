import { useSyncExternalStore } from 'react';
import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import type { Shoe } from '../core/shoes';

const KEY = 'askesis:shoes';
const listeners = new Set<() => void>();
let memoryRaw = '[]';

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? '[]';
  } catch {
    return memoryRaw;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  const offRemote = onRemoteChanges(listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    offRemote();
  };
}

/** Shoes live as a synced Askesis preference, so they travel with the account and family backup. */
export function loadShoes(): Shoe[] {
  try {
    const parsed = JSON.parse(readRaw()) as Shoe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShoes(next: readonly Shoe[]): void {
  let defaultSeen = false;
  const clean = next.map((shoe) => {
    const isDefault = Boolean(shoe.isDefault && !shoe.retiredOn && !defaultSeen);
    if (isDefault) defaultSeen = true;
    return { ...shoe, isDefault };
  });
  const raw = JSON.stringify(clean);
  memoryRaw = raw;
  try {
    if (clean.length) localStorage.setItem(KEY, raw);
    else localStorage.removeItem(KEY);
  } catch {
    // The in-memory copy still works for this visit if browser storage is blocked.
  }
  notify();
  syncSoon();
}

export function useShoes(): Shoe[] {
  const raw = useSyncExternalStore(subscribe, readRaw);
  try {
    const parsed = JSON.parse(raw) as Shoe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
