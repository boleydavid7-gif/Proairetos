/**
 * Reflect's timeline with each app's entries folded into one row: the person's own reflections stay as they are,
 * and everything an app brought (runs, meals, reading, and the lines kept after them) sits under that app's name,
 * placed at its latest entry. Someone who runs every day keeps a short list.
 */
export type GroupedApp = 'askesis' | 'soma' | 'theoria' | 'dynamis' | 'poreia';

type Entry = { at: string; reflection?: { promptKey?: string }; study?: unknown; meal?: unknown; run?: unknown };

const BY_PROMPT: Record<string, GroupedApp> = {
  'after-run': 'askesis',
  'after-meal': 'soma',
  'after-study': 'theoria',
  'after-reading': 'theoria',
  'after-strength': 'dynamis',
  'after-trip': 'poreia',
};

/** The app an entry came from, or null for the person's own reflections. */
export function appOf(entry: Entry): GroupedApp | null {
  if (entry.run) return 'askesis';
  if (entry.meal) return 'soma';
  if (entry.study) return 'theoria';
  const key = entry.reflection?.promptKey;
  return key ? (BY_PROMPT[key] ?? null) : null;
}

export type TimelineRow<E extends Entry> =
  | { kind: 'own'; at: string; entry: E }
  | { kind: 'app'; at: string; app: GroupedApp; entries: E[] };

/** Newest first; an app's row sits where its newest entry would. */
export function groupTimeline<E extends Entry>(entries: E[]): TimelineRow<E>[] {
  const rows: TimelineRow<E>[] = [];
  const groups = new Map<GroupedApp, { kind: 'app'; at: string; app: GroupedApp; entries: E[] }>();
  for (const entry of [...entries].sort((a, b) => b.at.localeCompare(a.at))) {
    const app = appOf(entry);
    if (!app) {
      rows.push({ kind: 'own', at: entry.at, entry });
      continue;
    }
    const group = groups.get(app);
    if (group) group.entries.push(entry);
    else {
      const created = { kind: 'app' as const, at: entry.at, app, entries: [entry] };
      groups.set(app, created);
      rows.push(created);
    }
  }
  return rows;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** What a folded row holds, in plain words: "3 runs, 1 note". */
export function groupSummary(entries: Entry[]): string {
  const runs = entries.filter((entry) => entry.run).length;
  const meals = entries.filter((entry) => entry.meal).length;
  const study = entries.filter((entry) => entry.study).length;
  const notes = entries.filter((entry) => entry.reflection).length;
  return [
    runs && plural(runs, 'run', 'runs'),
    meals && plural(meals, 'meal', 'meals'),
    study && plural(study, 'session', 'sessions'),
    notes && plural(notes, 'note', 'notes'),
  ]
    .filter(Boolean)
    .join(', ');
}

export const GROUP_NAMES: Record<GroupedApp, string> = {
  askesis: 'Askesis',
  soma: 'Soma',
  theoria: 'Theoria',
  dynamis: 'Dynamis',
  poreia: 'Poreia',
};
