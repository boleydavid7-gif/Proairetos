import { APPS } from '../apps/manifest';
import type { Notice } from './notices';

/**
 * Every app in the family keeps its own reminder rows on the server, so one app refreshing its times never
 * takes away another's. On an iPhone each Home Screen app has its own storage: Hydros knows the water times,
 * Oikonomia the bills, Praxis the block that is running. Each writes what it owns; Proairetos also writes the
 * others' when it holds their data, so they stay current even when that app is seldom opened.
 */
export type ReminderSource = 'proairetos' | 'askesis' | 'oikonomia' | 'hydros' | 'poreia' | 'praxis' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'melete';
export type FamilyApp = ReminderSource | 'soma' | 'theoria' | 'mneme' | 'melete';

/* Everything below reads the application manifest (src/core/apps/manifest.ts). */
export const REMINDER_SOURCES: readonly ReminderSource[] = APPS.flatMap((app) => (app.notices.source ? [app.notices.source as ReminderSource] : []));

// A retired app wears the name of the app it lives in now (Praxis's reading blocks are Theoria's).
const APP_NAMES = Object.fromEntries(APPS.map((app) => [app.id, app.aliasOf ? (APPS.find((a) => a.id === app.aliasOf)?.name ?? app.name) : app.name])) as Record<FamilyApp, string>;

export const appFromOpen = (open: string): FamilyApp => {
  for (const app of APPS) {
    if (app.status !== 'main' && (open === app.id || open.startsWith(`${app.id}:`))) return app.id as FamilyApp;
  }
  return 'proairetos';
};

/** The app label shown with a notification, including reminders opened from a companion app. */
export function appNameForOpen(open: string): string {
  return APP_NAMES[appFromOpen(open)];
}

/** The app icon used by the shared worker and by an in-app notification. */
export function iconForOpen(open: string): string {
  // Praxis's reading blocks live in Theoria now, so their notices wear Theoria's icon.
  const app = appFromOpen(open) === 'praxis' ? 'theoria' : appFromOpen(open);
  return app === 'proairetos' ? '/icons/icon-192.png' : `/${app}/icons/icon-192.png`;
}

const KIND_SOURCE = new Map<string, ReminderSource>(APPS.flatMap((app) => app.notices.kinds.map((kind) => [kind, app.notices.source as ReminderSource] as const)));

export function sourceOf(notice: Pick<Notice, 'kind'>): ReminderSource {
  return KIND_SOURCE.get(notice.kind) ?? 'proairetos';
}

/** Which app this page is, from its address. */
export function appAt(pathname: string): FamilyApp {
  const first = pathname.split('/').filter(Boolean)[0];
  return (APPS.find((app) => app.status !== 'main' && app.id === first)?.id as FamilyApp | undefined) ?? 'proairetos';
}

/**
 * The sources this app writes. An app always writes its own (an empty list clears it). Proairetos also writes
 * Askesis, Oikonomia and Hydros when it has something of theirs, or wrote theirs before (so a last bill removed
 * is cleared too). The block running in Praxis is known only where it runs, so only Praxis writes it.
 */
export function sourcesToWrite(
  app: FamilyApp,
  notices: readonly Pick<Notice, 'kind'>[],
  writtenBefore: readonly ReminderSource[] = [],
): ReminderSource[] {
  // An app with no reminder source of its own writes none.
  if (app !== 'proairetos' && !APPS.find((a) => a.id === app)?.notices.source) return [];
  if (app !== 'proairetos') return [app as ReminderSource];
  const present = new Set(notices.map(sourceOf));
  const others = APPS.filter((a) => a.notices.mainWrites).map((a) => a.notices.source as ReminderSource).filter((source) => present.has(source) || writtenBefore.includes(source));
  return ['proairetos', ...others];
}

/** The words a reminder carries, sealed on the device; short enough for a push. */
export type NoticeWords = { k: string; t: string; b: string; o: string };

export function wordsOf(notice: Pick<Notice, 'key' | 'title' | 'body' | 'open'>): NoticeWords {
  return { k: notice.key.slice(0, 120), t: notice.title.slice(0, 120), b: notice.body.slice(0, 300), o: notice.open.slice(0, 160) };
}
