import { useSyncExternalStore } from 'react';
import type { Balance, Pay } from '../core/pay';

// When pay comes in, and what the person last said is in the account: settings, so they are backed up and sync.
const PAY = 'oikonomia:pay';
const BALANCE = 'oikonomia:balance';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => (event.key === PAY || event.key === BALANCE) && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function loadPays(): Pay[] {
  try {
    const list = JSON.parse(read(PAY) || '[]') as Pay[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function savePays(next: readonly Pay[]): void {
  localStorage.setItem(PAY, JSON.stringify(next));
  notify();
}

export function loadBalance(): Balance | undefined {
  try {
    return JSON.parse(read(BALANCE) || 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveBalance(next: Balance | undefined): void {
  if (next) localStorage.setItem(BALANCE, JSON.stringify(next));
  else localStorage.removeItem(BALANCE);
  notify();
}

export function usePays(): Pay[] {
  const raw = useSyncExternalStore(subscribe, () => read(PAY));
  try {
    const list = JSON.parse(raw || '[]') as Pay[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function useBalance(): Balance | undefined {
  const raw = useSyncExternalStore(subscribe, () => read(BALANCE));
  try {
    return JSON.parse(raw || 'null') ?? undefined;
  } catch {
    return undefined;
  }
}
