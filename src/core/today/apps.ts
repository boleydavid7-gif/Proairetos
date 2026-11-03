/** Companion apps surfaced on Proairetos Today. */
export const DAILY_PRACTICE_APPS = ['hydros', 'askesis', 'dynamis', 'diaita', 'theoria'] as const;
export const WORTH_ATTENTION_APPS = ['ergon', 'ktema', 'oikonomia', 'philia', 'phyton', 'poreia', 'soma', 'therapeia'] as const;

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
