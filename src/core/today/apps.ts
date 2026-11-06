import { APPS } from '../apps/manifest';

/** Companion apps surfaced on Proairetos Today. */
const inGroup = (group: 'practice' | 'attention') =>
  APPS.filter((app) => app.today?.group === group)
    .sort((a, b) => (a.today?.order ?? 0) - (b.today?.order ?? 0))
    .map((app) => app.id);
export const DAILY_PRACTICE_APPS = inGroup('practice') as unknown as readonly ['hydros', 'askesis', 'dynamis', 'diaita', 'theoria', 'melete'];
export const WORTH_ATTENTION_APPS = inGroup('attention') as unknown as readonly ['ergon', 'ktema', 'oikonomia', 'philia', 'phyton', 'poreia', 'soma', 'therapeia'];

export type DailyPracticeApp = (typeof DAILY_PRACTICE_APPS)[number];
export type AttentionApp = (typeof WORTH_ATTENTION_APPS)[number];
export type TodayApp = DailyPracticeApp | AttentionApp;
/** A saved list may contain old or unknown app IDs; keep only the supported companions. */
export function readHiddenTodayApps(value: unknown): TodayApp[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((app): app is TodayApp =>
    typeof app === 'string' && ([...DAILY_PRACTICE_APPS, ...WORTH_ATTENTION_APPS] as readonly string[]).includes(app),
  ))];
}
