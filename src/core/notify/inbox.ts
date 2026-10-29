import type { LogEntry } from '../../askesis/core/log';
import { formatDistance, type Unit } from '../../askesis/core/pace';
import type { Workout as StrengthWorkout } from '../../dynamis/core/plan';
import type { Notice, NoticeKind } from './notices';
import { appFromOpen, type FamilyApp } from './sources';

/**
 * The notifications page and Today's card: notices whose time has come, what changed in the person's schedule, and
 * milestones from runs and strength sessions (the owner's choice). Plain facts, newest first; nothing piles up, since
 * only the last few days are kept.
 */
export type InboxKind = NoticeKind | 'schedule-change' | 'milestone' | 'household';

export type InboxEntry = { key: string; kind: InboxKind; at: Date; title: string; body: string; open: string };

/** How far back the page looks. */
export const INBOX_DAYS = 3;

/** Notices that belong on the page once their time has come. Sleep, water, the bell and shift starts are left out. */
const KEPT: ReadonlySet<InboxKind> = new Set<InboxKind>(['item', 'calendar', 'check-back', 'look-back', 'run', 'bill', 'study', 'person', 'chore', 'dose', 'care', 'training', 'upkeep', 'plant', 'trip', 'pursuit']);

/** What Today's card brings forward: changes and things with money, health or travel at stake. */
const IMPORTANT: ReadonlySet<InboxKind> = new Set<InboxKind>(['schedule-change', 'bill', 'care', 'trip', 'household']);

export const isImportant = (entry: Pick<InboxEntry, 'kind'>): boolean => IMPORTANT.has(entry.kind);

/** Notices from the last few days whose time has come, as entries. */
export function cameDue(notices: readonly Notice[], now: Date): InboxEntry[] {
  const since = now.getTime() - INBOX_DAYS * 86_400_000;
  return notices
    .filter((notice) => KEPT.has(notice.kind) && notice.at.getTime() <= now.getTime() && notice.at.getTime() >= since)
    .map(({ key, kind, at, title, body, open }) => ({ key, kind, at, title, body, open }));
}

/** Newest first, one per key, only the last few days. */
export function arrangeInbox(entries: readonly InboxEntry[], now: Date): InboxEntry[] {
  const since = now.getTime() - INBOX_DAYS * 86_400_000;
  const seen = new Set<string>();
  return [...entries]
    .filter((entry) => entry.at.getTime() >= since && entry.at.getTime() <= now.getTime() + 60_000)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .filter((entry) => (seen.has(entry.key) ? false : (seen.add(entry.key), true)));
}

/** "Now", "12 min ago", "2h ago", "Yesterday", "2d ago". */
export function agoText(at: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

// ── Schedule changes ─────────────────────────────────────────────────────────

/** One block of the person's schedule as it stood: its day, name and times. */
export type SeenBlock = { day: string; name: string; start: string; end: string };

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const dayOf = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * What changed between two looks at the coming days: a block that starts or ends at another time, one added and one
 * taken off. More than three changes at once (a new rotation, say) become one line.
 */
export function scheduleChanges(before: readonly SeenBlock[], after: readonly SeenBlock[], now: Date): InboxEntry[] {
  const id = (block: SeenBlock) => `${block.day}|${block.name.toLowerCase()}`;
  const old = new Map(before.map((block) => [id(block), block]));
  const fresh = new Map(after.map((block) => [id(block), block]));
  const lines: { day: string; body: string }[] = [];
  for (const [key, block] of fresh) {
    const was = old.get(key);
    if (!was) lines.push({ day: block.day, body: `${block.name} added on ${dayOf(block.day)}, ${timeOf(block.start)} to ${timeOf(block.end)}.` });
    else if (was.start !== block.start) lines.push({ day: block.day, body: `${block.name} on ${dayOf(block.day)} was moved to ${timeOf(block.start)}.` });
    else if (was.end !== block.end) lines.push({ day: block.day, body: `${block.name} on ${dayOf(block.day)} now ends at ${timeOf(block.end)}.` });
  }
  for (const [key, block] of old) {
    if (!fresh.has(key)) lines.push({ day: block.day, body: `${block.name} on ${dayOf(block.day)} was taken off.` });
  }
  if (lines.length === 0) return [];
  const stamp = now.getTime();
  if (lines.length > 3) {
    const days = new Set(lines.map((line) => line.day)).size;
    return [{ key: `schedule:${stamp}`, kind: 'schedule-change', at: now, title: 'Schedule change', body: `Your schedule changed on ${days} day${days === 1 ? '' : 's'}.`, open: 'day:today' }];
  }
  return lines.map((line, index) => ({ key: `schedule:${stamp}:${index}`, kind: 'schedule-change', at: now, title: 'Schedule change', body: line.body, open: `day:${line.day}` }));
}

// ── Milestones ───────────────────────────────────────────────────────────────

/** Counts that are worth a line. */
const COUNTS = [1, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

const loggedAt = (entry: { date: string; createdAt?: string }): Date => (entry.createdAt ? new Date(entry.createdAt) : new Date(`${entry.date}T12:00:00`));

/**
 * Milestones from runs, as each one was logged: the 1st, 10th, 25th… run, and a run longer than any before it
 * (from the third run on, so the first few are not all "longest").
 */
export function runMilestones(entries: readonly LogEntry[], unit: Unit): InboxEntry[] {
  const runs = entries.filter((entry) => entry.activity === 'run').sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const out: InboxEntry[] = [];
  let longest = 0;
  runs.forEach((run, index) => {
    const count = index + 1;
    const at = loggedAt(run);
    if (COUNTS.includes(count)) out.push({ key: `milestone:runs:${count}`, kind: 'milestone', at, title: 'Milestone', body: count === 1 ? 'First run logged.' : `${count} runs logged.`, open: 'askesis' });
    const meters = run.meters ?? 0;
    if (meters > longest) {
      if (count >= 3 && longest > 0) out.push({ key: `milestone:longest:${run.id}`, kind: 'milestone', at, title: 'Longest run yet', body: `${formatDistance(meters, unit)} on ${dayOf(run.date)}.`, open: 'askesis' });
      longest = meters;
    }
  });
  return out;
}

/**
 * Milestones from strength sessions: the 1st, 10th, 25th… session, and a heavier set on an exercise than any before
 * (from its third session on).
 */
export function strengthMilestones(workouts: readonly StrengthWorkout[], unit: 'kg' | 'lb'): InboxEntry[] {
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const out: InboxEntry[] = [];
  const heaviest = new Map<string, number>();
  const sessions = new Map<string, number>();
  sorted.forEach((workout, index) => {
    const count = index + 1;
    const at = loggedAt(workout);
    if (COUNTS.includes(count)) out.push({ key: `milestone:strength:${count}`, kind: 'milestone', at, title: 'Milestone', body: count === 1 ? 'First strength session logged.' : `${count} strength sessions logged.`, open: 'dynamis' });
    // One line a session, however many lifts were heavier than before.
    const heavier: string[] = [];
    for (const log of workout.exercises) {
      const top = Math.max(0, ...log.sets.map((set) => set.weight ?? 0));
      const times = (sessions.get(log.exercise) ?? 0) + 1;
      sessions.set(log.exercise, times);
      const before = heaviest.get(log.exercise) ?? 0;
      if (top > before) {
        if (times >= 3 && before > 0) heavier.push(`${log.name} ${top} ${unit}`);
        heaviest.set(log.exercise, top);
      }
    }
    if (heavier.length) out.push({ key: `milestone:heaviest:${workout.id}`, kind: 'milestone', at, title: 'Heaviest yet', body: `${heavier.join(', ')}.`, open: 'dynamis' });
  });
  return out;
}

/** Entries by app, like a phone's notification stacks: each app's newest first, apps by their newest entry. */
export function byApp(entries: readonly InboxEntry[]): { app: FamilyApp; entries: InboxEntry[] }[] {
  const groups = new Map<FamilyApp, InboxEntry[]>();
  for (const entry of [...entries].sort((a, b) => b.at.getTime() - a.at.getTime())) {
    const raw = appFromOpen(entry.open);
    const app: FamilyApp = raw === 'praxis' ? 'theoria' : raw;
    groups.set(app, [...(groups.get(app) ?? []), entry]);
  }
  return [...groups].map(([app, list]) => ({ app, entries: list }));
}
