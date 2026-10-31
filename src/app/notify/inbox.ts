import { useSyncExternalStore } from 'react';
import { arrangeInbox, cameDue, INBOX_DAYS, isImportant, runMilestones, scheduleChanges, strengthMilestones, type InboxEntry, type SeenBlock } from '../../core/notify/inbox';
import type { Workout as StrengthWorkout } from '../../dynamis/core/plan';
import { loadNotify } from '../../data/storage/preferences';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { isAdded } from '../family/added';
import { scheduleService } from '../services';
import { notifications } from './notifications';
import { attention, onAttention, showIconBadge } from '../../lamplight/attention';

/**
 * The notifications page's list (the bell on Today and its count, Today's card for important ones). Worked out on
 * the device from the same notices the phone shows, what changed in the schedule, and run and strength milestones.
 * What was seen (the bell's count) and cleared is kept on this device only (`proairetosInboxSeen`,
 * `proairetosInboxCleared`), as are the schedule as last seen and its changes.
 */
const SEEN_KEYS = 'proairetosInboxSeen';
const CLEARED = 'proairetosInboxCleared';
const SEEN = 'proairetosScheduleSeen';
const CHANGES = 'proairetosScheduleChanges';
const AHEAD_DAYS = 14;

type Stored = Omit<InboxEntry, 'at'> & { at: string };

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the list still shows, only what was read is forgotten.
  }
};

let entries: InboxEntry[] = [];
let seenKeys = new Set<string>(read<string[]>(SEEN_KEYS, []));
let clearedKeys = new Set<string>(read<string[]>(CLEARED, []));
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version += 1;
  for (const listener of listeners) listener();
  badgeIcon();
};

/** The count on the app's icon follows the bell's on every page, not only while Today is open. */
function badgeIcon(): void {
  if (!started) return;
  const unseen = entries.filter((entry) => !clearedKeys.has(entry.key) && !seenKeys.has(entry.key)).length;
  showIconBadge(attention().bell === 'off' ? 0 : unseen);
}

function storedChanges(now: Date): InboxEntry[] {
  const since = now.getTime() - INBOX_DAYS * 86_400_000;
  return read<Stored[]>(CHANGES, [])
    .map((entry) => ({ ...entry, at: new Date(entry.at) }))
    .filter((entry) => entry.at.getTime() >= since);
}

function strengthWorkouts(): { workouts: StrengthWorkout[]; unit: 'kg' | 'lb' } {
  const workouts: StrengthWorkout[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('dynamis:workout:')) {
        const workout = read<StrengthWorkout | null>(key, null);
        if (workout?.date) workouts.push(workout);
      }
    }
  } catch {
    // Nothing to read.
  }
  const unit = read<{ unit?: 'kg' | 'lb' }>('dynamis:setup', {}).unit ?? 'kg';
  return { workouts, unit };
}

/** Works the list out again. */
export async function refreshInbox(now = new Date()): Promise<void> {
  const settings = loadNotify();
  const since = new Date(now.getTime() - INBOX_DAYS * 86_400_000);
  const { upcomingNotices } = await import('./upcoming');
  const notices = await upcomingNotices(since, settings).catch(() => []);
  const found: InboxEntry[] = [...cameDue(notices, now)];
  if (settings.scheduleChanges) found.push(...storedChanges(now));
  if (settings.runMilestones && isAdded('askesis')) {
    const { readRuns } = await import('../askesis/runs');
    const runs = await readRuns().catch(() => undefined);
    if (runs) found.push(...runMilestones(runs.workouts, runs.unit));
  }
  if (settings.strengthMilestones && isAdded('dynamis')) {
    const { workouts, unit } = strengthWorkouts();
    found.push(...strengthMilestones(workouts, unit));
  }
  // Household invites waiting for this account (read by `app/household/invites.ts`, kept on the device).
  try {
    const invites = JSON.parse(localStorage.getItem('proairetosHouseholdInvites') ?? '[]') as { id: string; from: string; household: { name: string }; at: string }[];
    for (const invite of invites) {
      const at = new Date(invite.at);
      found.push({ key: `household-invite:${invite.id}`, kind: 'household', at: at.getTime() < since.getTime() ? now : at, title: 'Household invite', body: `${invite.from} invited you to ${invite.household.name}.`, open: 'settings:household' });
    }
  } catch {
    // Nothing kept.
  }
  entries = arrangeInbox(found, now);
  // What was seen or cleared and has since left the list is forgotten.
  const keys = new Set(entries.map((entry) => entry.key));
  seenKeys = new Set([...seenKeys].filter((key) => keys.has(key)));
  clearedKeys = new Set([...clearedKeys].filter((key) => keys.has(key)));
  write(SEEN_KEYS, [...seenKeys]);
  write(CLEARED, [...clearedKeys]);
  changed();
}

/** Opening the list sees everything in it, so the bell's count goes. */
export function markSeen(keys: readonly string[]): void {
  if (keys.every((key) => seenKeys.has(key))) return;
  for (const key of keys) seenKeys.add(key);
  write(SEEN_KEYS, [...seenKeys]);
  changed();
}

/** Takes entries off the list (and off Today's card). */
export function clearEntries(keys: readonly string[]): void {
  for (const key of keys) {
    clearedKeys.add(key);
    seenKeys.add(key);
  }
  write(CLEARED, [...clearedKeys]);
  write(SEEN_KEYS, [...seenKeys]);
  changed();
}

/** Puts cleared entries back (undo). */
export function unclearEntries(keys: readonly string[]): void {
  for (const key of keys) clearedKeys.delete(key);
  write(CLEARED, [...clearedKeys]);
  changed();
}

/** Looks at the coming two weeks of the schedule and notes what changed since the last look. */
async function lookAtSchedule(): Promise<void> {
  const now = new Date();
  const occurrences = await scheduleService.occurrencesBetween(now, new Date(now.getTime() + AHEAD_DAYS * 86_400_000));
  const blocks: SeenBlock[] = occurrences
    .filter((block) => block.kind === 'COMMITTED' || block.kind === 'PROTECTED')
    .map((block) => ({ day: block.date, name: block.label ? `${block.patternName} · ${block.label}` : block.patternName, start: block.start.toISOString(), end: block.end.toISOString() }));
  const before = read<SeenBlock[] | null>(SEEN, null);
  write(SEEN, blocks);
  if (!before) return;
  // Only days both looks cover: days that simply came into view, or passed, are not changes.
  const from = toLocalDate(now);
  const last = addDays(from, AHEAD_DAYS - 1);
  const inBoth = (block: SeenBlock) => block.day > from && block.day < last;
  const found = scheduleChanges(before.filter(inBoth), blocks.filter(inBoth), now);
  if (found.length === 0) return;
  write(CHANGES, [...storedChanges(now), ...found].map((entry) => ({ ...entry, at: entry.at.toISOString() })));
  void refreshInbox(now);
}

let started = false;

/** Keeps the list fresh while the app is open: on start, as notices or the schedule change, every few minutes. */
export function startInbox(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  onAttention(badgeIcon);
  let timer: number | undefined;
  const soon = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void refreshInbox(), 400);
  };
  let scheduleTimer: number | undefined;
  scheduleService.subscribe(() => {
    window.clearTimeout(scheduleTimer);
    scheduleTimer = window.setTimeout(() => void lookAtSchedule().catch(() => undefined), 500);
  });
  notifications.subscribe(soon);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && soon());
  window.setInterval(() => document.visibilityState === 'visible' && void refreshInbox(), 5 * 60_000);
  void lookAtSchedule().catch(() => undefined);
  soon();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type Inbox = { entries: InboxEntry[]; unseen: InboxEntry[]; important: InboxEntry[] };

let snapshot: { version: number; inbox: Inbox } | undefined;

function current(): Inbox {
  if (snapshot?.version === version) return snapshot.inbox;
  const shown = entries.filter((entry) => !clearedKeys.has(entry.key));
  const inbox = { entries: shown, unseen: shown.filter((entry) => !seenKeys.has(entry.key)), important: shown.filter(isImportant) };
  snapshot = { version, inbox };
  return inbox;
}

export function useInbox(): Inbox {
  return useSyncExternalStore(subscribe, current, current);
}
