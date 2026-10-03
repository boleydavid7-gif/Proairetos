import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { addDays, mondayOnOrBefore, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { syncStatus, type SyncStatus } from '../../app/sync/syncController';
import { buildPath, defaultWeekdays, fromWeek, lastWeekOf, ownPath, type PathChoice, type Plan } from '../core/plans';
import type { LogEntry } from '../core/log';
import { scheduleBetween } from '../data/proairetosSchedule';
import {
  listEntries,
  loadPlan,
  loadSettings,
  savePlan,
  subscribe,
  type PlanState,
  type Settings,
} from '../data/store';

let version = 0;
subscribe(() => {
  version += 1;
});
const snapshot = () => version;

/** Re-renders whenever anything Askesis keeps changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, snapshot);
}

export function useSettings(): Settings {
  const v = useStoreVersion();
  return useMemo(() => loadSettings(), [v]);
}

export function usePlanState(): PlanState | undefined {
  const v = useStoreVersion();
  return useMemo(() => loadPlan(), [v]);
}

/** The path from what is saved: same aim, days, pace and date give the same path. */
export function pathFor(state: PlanState): Plan {
  return ownPath(state);
}

export function usePlan(state: PlanState | undefined): Plan | undefined {
  return useMemo(
    () => (state ? pathFor(state) : undefined),
    [JSON.stringify(state?.aim), state?.days, state?.gentler, state?.walkFirst, state?.raceDate, state?.joinWeek, state?.startedOn],
  );
}

export function useEntries(): LogEntry[] | undefined {
  const v = useStoreVersion();
  const [entries, setEntries] = useState<LogEntry[]>();
  useEffect(() => {
    let live = true;
    void listEntries().then((list) => live && setEntries(list));
    return () => {
      live = false;
    };
  }, [v]);
  return entries;
}

/** The local date, refreshed each minute so a page left open turns over at midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => toLocalDate(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(toLocalDate(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}

/** This week's work blocks from Proairetos, when the person allows reading them. */
export function useWeekSchedule(today: string, allowed: boolean): ScheduleOccurrence[] {
  const [blocks, setBlocks] = useState<ScheduleOccurrence[]>([]);
  useEffect(() => {
    if (!allowed) {
      setBlocks([]);
      return;
    }
    const monday = mondayOnOrBefore(today);
    void scheduleBetween(parseLocalDate(addDays(monday, -1)), parseLocalDate(addDays(monday, 8))).then(setBlocks);
  }, [today, allowed]);
  return blocks;
}

export type PathStart = PathChoice & { weekdays?: number[]; week?: number; ownWeek?: number; aimWords?: string };

/**
 * Begins a path. `week` is the week of the full path where the runner is now;
 * `ownWeek` is the number they know it by (1 for a new start, or the week
 * they were on when carrying on with a changed aim).
 */
export function startPlan(choice: PathStart, today: string, keep: Partial<PlanState> = {}): void {
  const days = Math.min(6, Math.max(3, choice.days));
  const natural = buildPath({ ...choice, days, joinWeek: Math.max(1, choice.week ?? 1), today });
  const now = Math.min(natural.weeks.length, Math.max(1, choice.week ?? 1));
  const ownWeek = Math.max(1, choice.ownWeek ?? 1);
  const joinWeek = now - ownWeek + 1;
  const own = fromWeek(natural, joinWeek);
  savePlan({
    startWeeks: own.cycleFrom ? undefined : lastWeekOf(own),
    startedOn: today,
    ...keep,
    aim: choice.aim,
    aimWords: choice.aimWords?.trim() || undefined,
    days,
    gentler: choice.gentler || undefined,
    walkFirst: choice.walkFirst || undefined,
    raceDate: choice.raceDate || undefined,
    weekdays: choice.weekdays?.length === days ? choice.weekdays : defaultWeekdays(days),
    week: ownWeek,
    joinWeek,
    numbering: 'own',
    weekOf: mondayOnOrBefore(today),
    moves: {},
  });
}

export function updatePlan(change: Partial<PlanState>): void {
  const current = loadPlan();
  if (current) savePlan({ ...current, ...change });
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** The Proairetos account, shared: signed in there means signed in here. */
export function useAccount(): SyncStatus {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
}
