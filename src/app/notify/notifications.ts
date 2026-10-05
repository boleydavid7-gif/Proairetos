import { privateNotice, type Notice, type NoticeSettings } from '../../core/notify/notices';
import { loadNotify, loadQuietHours, saveNotify } from '../../data/storage/preferences';
import { otherCalendars } from '../calendars/otherCalendars';
import { decisionService, lifeService, scheduleService } from '../services';
import { refreshReminders } from '../sync/syncController';
import { upcomingNotices } from './upcoming';
import { hydrationNotices, setHydrationSchedule } from './hydrationSchedule';

/**
 * Notifications, written on this device. The app works out what is due
 * (`noticesBetween`) and keeps the next two weeks in Cache Storage, where
 * the service worker can read them: when a push arrives (empty, from the
 * server, which knows only times), it shows the real words. While the app
 * is open, a timer shows them too. A notification's tag is its key, so
 * one that arrives both ways shows once.
 */
export type Permission = 'unsupported' | 'default' | 'granted' | 'denied';

const CACHE = 'proairetos-notify';
const UPCOMING = '/__notify/upcoming.json';
const SHOWN = '/__notify/shown.json';
/** The longest a timer waits before looking again, so a sleeping laptop catches up. */
const LONGEST_WAIT = 60 * 60_000;

export type StoredNotice = { key: string; at: string; title: string; body: string; open: string };

const listeners = new Set<() => void>();
let timer: number | undefined;
let pending: number | undefined;
let upcoming: Notice[] = [];

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

function runningInBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function notify(): void {
  for (const listener of listeners) listener();
}

async function store(notices: readonly Notice[], details: boolean): Promise<void> {
  const stored: StoredNotice[] = notices.map((notice) => {
    const shown = details ? notice : privateNotice(notice);
    return { key: notice.key, at: notice.at.toISOString(), title: shown.title, body: shown.body, open: notice.open };
  });
  try {
    const cache = await caches.open(CACHE);
    await cache.put(
      UPCOMING,
      new Response(JSON.stringify(stored), { headers: { 'content-type': 'application/json' } }),
    );
  } catch {
    // No Cache Storage here; notifications still show while the app is open.
  }
}

async function show(notice: Notice, details: boolean): Promise<void> {
  if (notifications.permission() !== 'granted') return;
  const shown = details ? notice : privateNotice(notice);
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(shown.title, {
    body: shown.body,
    tag: notice.key,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { open: notice.open },
    timestamp: notice.at.getTime(),
  } as NotificationOptions);
  // So a push for the same moment does not show it a second time.
  try {
    const cache = await caches.open(CACHE);
    const kept = await cache.match(SHOWN);
    const shownKeys: string[] = kept ? await kept.json() : [];
    shownKeys.push(notice.key);
    await cache.put(
      SHOWN,
      new Response(JSON.stringify(shownKeys.slice(-300)), { headers: { 'content-type': 'application/json' } }),
    );
  } catch {
    // Only matters when a push arrives too.
  }
}

/** Waits for the next notice while the app is open, shows it, and waits again. */
function arm(): void {
  window.clearTimeout(timer);
  const next = upcoming[0];
  if (!next) return;
  const wait = Math.min(LONGEST_WAIT, Math.max(0, next.at.getTime() - Date.now()));
  timer = window.setTimeout(async () => {
    const now = Date.now();
    const due = upcoming.filter((notice) => notice.at.getTime() <= now + 1000);
    upcoming = upcoming.filter((notice) => notice.at.getTime() > now + 1000);
    const details = loadNotify().details;
    for (const notice of due) await show(notice, details).catch(() => undefined);
    if (due.some((notice) => notice.kind === 'hydration')) {
      // Rebuild the horizon after a hydration reminder is delivered. This
      // keeps the local cache and the closed-app schedule rolling forward.
      void notifications.refresh();
      return;
    }
    arm();
  }, wait);
}

export const notifications = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  permission(): Permission {
    if (!supported()) return 'unsupported';
    return Notification.permission as Permission;
  },

  /** Asks the phone once, from a tap. */
  async ask(): Promise<Permission> {
    if (!supported()) return 'unsupported';
    const answer = (await Notification.requestPermission()) as Permission;
    notify();
    await notifications.refresh();
    return answer;
  },

  settings(): NoticeSettings {
    return loadNotify();
  },

  setSettings(next: NoticeSettings): void {
    saveNotify(next);
    notify();
    // Refresh the server schedule immediately so a changed lead time replaces
    // any old pending row before it can fire at the wrong time.
    void refreshReminders();
    notifications.refreshSoon();
  },

  /** Adds Hydros' repeating drink reminder to the shared Proairetos scheduler. */
  setHydrationSchedule(next: { enabled: boolean; intervalMinutes: number }): void {
    setHydrationSchedule(next);
    void refreshReminders();
    notifications.refreshSoon();
  },

  /** The next few, for Settings to show what is coming and how it will read. */
  next(): readonly Notice[] {
    return upcoming;
  },

  /** Works out the next two weeks again, keeps them for the service worker, and resets the timer. */
  async refresh(): Promise<void> {
    if (!runningInBrowser()) return;
    const settings = loadNotify();
    upcoming = await upcomingNotices(new Date(), settings).catch(() => []);
    upcoming.push(...hydrationNotices(new Date(), loadQuietHours()));
    upcoming.sort((a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key));
    await store(upcoming, settings.details);
    if (notifications.permission() === 'granted') arm();
    // The server learns only the times, if reminders are on with sync.
    void refreshReminders();
    notify();
  },

  /** Many changes arrive together (a sync, a sheet of edits); work it out once. */
  refreshSoon(): void {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => void notifications.refresh(), 800);
  },

  /** Shows one now, so the person can see how they look on this phone. */
  async test(): Promise<void> {
    const soonest = upcoming[0];
    const sample: Notice = soonest
      ? { ...soonest, key: 'sample' }
      : {
          key: 'sample',
          kind: 'item',
          at: new Date(),
          title: 'Dentist',
          body: 'In 15 minutes · 4:00 PM · Main Street',
          open: 'today',
        };
    await show(sample, loadNotify().details);
  },

  /** Starts watching for changes; call once when the app opens. */
  start(): void {
    if (!runningInBrowser()) return;
    for (const service of [lifeService, decisionService, scheduleService, otherCalendars])
      service.subscribe(() => notifications.refreshSoon());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') notifications.refreshSoon();
    });
    void notifications.refresh();
  },
};
