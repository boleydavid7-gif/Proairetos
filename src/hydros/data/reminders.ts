import { loadQuietHours } from '../../data/storage/preferences';
import { listDrinks, loadSettings, subscribe } from './store';

let timer: number | undefined;
let started = false;
let scheduling = false;

function minutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function quietNow(date = new Date()): boolean {
  const quiet = loadQuietHours();
  const now = date.getHours() * 60 + date.getMinutes();
  const start = minutes(quiet.start);
  const end = minutes(quiet.end);
  return start === end ? false : start < end ? now >= start && now < end : now >= start || now < end;
}

function nextQuietEnd(date = new Date()): number {
  const quiet = loadQuietHours();
  const end = minutes(quiet.end);
  const next = new Date(date);
  next.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (next.getTime() <= date.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

async function showReminder(): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const body = 'A measured drink keeps the day in motion.';
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Hydros', { body, tag: 'hydros-water', icon: '/hydros/icon.svg', badge: '/hydros/icon.svg' });
    } else new Notification('Hydros', { body });
  } catch {
    // Notification support can disappear while a phone is suspended.
  }
}

async function schedule(): Promise<void> {
  if (scheduling) return;
  scheduling = true;
  window.clearTimeout(timer);
  timer = undefined;
  try {
    const settings = loadSettings();
    if (!settings.reminders || !('Notification' in window) || Notification.permission !== 'granted') return;
    const interval = Math.max(15, Math.min(240, settings.reminderIntervalMinutes ?? 120)) * 60_000;
    const drinks = await listDrinks();
    const latest = drinks.reduce((newest, drink) => Math.max(newest, new Date(drink.loggedAt).getTime()), 0);
    const since = latest > 0 ? Date.now() - latest : interval;
    let delay = Math.max(60_000, interval - since);
    const due = new Date(Date.now() + delay);
    if (quietNow(due)) delay = Math.max(60_000, nextQuietEnd(due) - Date.now());
    timer = window.setTimeout(async () => {
      if (!quietNow()) await showReminder();
      await schedule();
    }, delay);
  } finally {
    scheduling = false;
  }
}

/** Keeps hydration reminders local to this device; no reminder words leave it. */
export function startHydrosReminders(): void {
  if (started) return;
  started = true;
  subscribe(() => void schedule());
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void schedule(); });
  void schedule();
}

