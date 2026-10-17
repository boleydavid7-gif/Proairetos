import { useSyncExternalStore } from 'react';
import { ownWorkout, type OwnSession } from '../core/own';
import type { Workout } from '../core/workouts';

// The runner's own sessions: a setting, so they are backed up and sync with the account.
const KEY = 'askesis:own';
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

export function ownSessions(): OwnSession[] {
  try {
    const list = JSON.parse(read()) as OwnSession[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveOwnSessions(next: readonly OwnSession[]): void {
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function putOwnSession(session: OwnSession): void {
  const list = ownSessions();
  const at = list.findIndex((each) => each.id === session.id);
  saveOwnSessions(at >= 0 ? list.map((each) => (each.id === session.id ? session : each)) : [...list, session]);
}

export function removeOwnSession(id: string): OwnSession[] {
  const before = ownSessions();
  saveOwnSessions(before.filter((each) => each.id !== id));
  return before;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // A change from another app or device arrives through browser storage.
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useOwnSessions(): OwnSession[] {
  const raw = useSyncExternalStore(subscribe, read);
  try {
    const list = JSON.parse(raw) as OwnSession[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** An own session by id, as a workout for the guide and the log. */
export function ownWorkoutById(id: string): Workout | undefined {
  const found = ownSessions().find((each) => each.id === id);
  return found && ownWorkout(found);
}
