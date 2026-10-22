import type { Notice } from './notices';

/**
 * Every app in the family keeps its own reminder rows on the server, so one app refreshing its times never
 * takes away another's. On an iPhone each Home Screen app has its own storage: Hydros knows the water times,
 * Oikonomia the bills, Praxis the block that is running. Each writes what it owns; Proairetos also writes the
 * others' when it holds their data, so they stay current even when that app is seldom opened.
 */
export type ReminderSource = 'proairetos' | 'askesis' | 'oikonomia' | 'hydros' | 'poreia' | 'praxis' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton';
export type FamilyApp = ReminderSource | 'soma' | 'theoria';

export const REMINDER_SOURCES: readonly ReminderSource[] = ['proairetos', 'askesis', 'oikonomia', 'hydros', 'poreia', 'praxis', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'];

const APP_NAMES: Record<FamilyApp, string> = {
  proairetos: 'Proairetos', askesis: 'Askesis', oikonomia: 'Oikonomia', hydros: 'Hydros', praxis: 'Praxis', diaita: 'Diaita',
  philia: 'Philia', ergon: 'Ergon', therapeia: 'Therapeia', dynamis: 'Dynamis', ktema: 'Ktema', phyton: 'Phyton', soma: 'Soma', theoria: 'Theoria', poreia: 'Poreia',
};

const appFromOpen = (open: string): FamilyApp => {
  if (open === 'askesis' || open.startsWith('askesis:')) return 'askesis';
  if (open === 'oikonomia' || open.startsWith('oikonomia:')) return 'oikonomia';
  if (open === 'hydros' || open.startsWith('hydros:')) return 'hydros';
  if (open === 'poreia' || open.startsWith('poreia:')) return 'poreia';
  if (open === 'praxis' || open.startsWith('praxis:')) return 'praxis';
  for (const app of ['diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'] as const) {
    if (open === app || open.startsWith(`${app}:`)) return app;
  }
  return 'proairetos';
};

/** The app label shown with a notification, including reminders opened from a companion app. */
export function appNameForOpen(open: string): string {
  return APP_NAMES[appFromOpen(open)];
}

/** The app icon used by the shared worker and by an in-app notification. */
export function iconForOpen(open: string): string {
  const app = appFromOpen(open);
  return app === 'proairetos' ? '/icons/icon-192.png' : `/${app}/icons/icon-192.png`;
}

export function sourceOf(notice: Pick<Notice, 'kind'>): ReminderSource {
  switch (notice.kind) {
    case 'run':
      return 'askesis';
    case 'bill':
      return 'oikonomia';
    case 'hydration':
      return 'hydros';
    case 'study':
      return 'praxis';
    case 'rhythm':
      return 'diaita';
    case 'person':
      return 'philia';
    case 'chore':
      return 'ergon';
    case 'dose':
    case 'care':
      return 'therapeia';
    case 'training':
      return 'dynamis';
    case 'upkeep':
      return 'ktema';
    case 'plant':
      return 'phyton';
    case 'trip':
      return 'poreia';
    default:
      return 'proairetos';
  }
}

/** Which app this page is, from its address. */
export function appAt(pathname: string): FamilyApp {
  const first = pathname.split('/').filter(Boolean)[0];
  const apps: FamilyApp[] = ['askesis', 'soma', 'oikonomia', 'hydros', 'poreia', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'];
  return apps.find((app) => app === first) ?? 'proairetos';
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
  if (app === 'soma' || app === 'theoria') return [];
  if (app !== 'proairetos') return [app];
  const present = new Set(notices.map(sourceOf));
  const others = (['askesis', 'oikonomia', 'hydros', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia'] as const).filter((source) => present.has(source) || writtenBefore.includes(source));
  return ['proairetos', ...others];
}

/** The words a reminder carries, sealed on the device; short enough for a push. */
export type NoticeWords = { k: string; t: string; b: string; o: string };

export function wordsOf(notice: Pick<Notice, 'key' | 'title' | 'body' | 'open'>): NoticeWords {
  return { k: notice.key.slice(0, 120), t: notice.title.slice(0, 120), b: notice.body.slice(0, 300), o: notice.open.slice(0, 160) };
}
