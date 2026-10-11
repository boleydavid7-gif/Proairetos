import type { Notice } from './notices';

/**
 * Every app in the family keeps its own reminder rows on the server, so one app refreshing its times never
 * takes away another's. On an iPhone each Home Screen app has its own storage: HYDROS knows the water times,
 * Oikonomia the bills, Praxis the block that is running. Each writes what it owns; Proairetos also writes the
 * others' when it holds their data, so they stay current even when that app is seldom opened.
 */
export type ReminderSource = 'proairetos' | 'askesis' | 'oikonomia' | 'hydros' | 'praxis' | 'diaita' | 'philia' | 'ergon';
export type FamilyApp = ReminderSource | 'soma' | 'theoria';

export const REMINDER_SOURCES: readonly ReminderSource[] = ['proairetos', 'askesis', 'oikonomia', 'hydros', 'praxis', 'diaita', 'philia', 'ergon'];

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
    default:
      return 'proairetos';
  }
}

/** Which app this page is, from its address. */
export function appAt(pathname: string): FamilyApp {
  const first = pathname.split('/').filter(Boolean)[0];
  const apps: FamilyApp[] = ['askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon'];
  return apps.find((app) => app === first) ?? 'proairetos';
}

/**
 * The sources this app writes. An app always writes its own (an empty list clears it). Proairetos also writes
 * Askesis, Oikonomia and HYDROS when it has something of theirs, or wrote theirs before (so a last bill removed
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
  const others = (['askesis', 'oikonomia', 'hydros', 'diaita', 'philia', 'ergon'] as const).filter((source) => present.has(source) || writtenBefore.includes(source));
  return ['proairetos', ...others];
}

/** The words a reminder carries, sealed on the device; short enough for a push. */
export type NoticeWords = { k: string; t: string; b: string; o: string };

export function wordsOf(notice: Pick<Notice, 'key' | 'title' | 'body' | 'open'>): NoticeWords {
  return { k: notice.key.slice(0, 120), t: notice.title.slice(0, 120), b: notice.body.slice(0, 300), o: notice.open.slice(0, 160) };
}
