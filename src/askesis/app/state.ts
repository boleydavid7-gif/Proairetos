import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { addDays, mondayOnOrBefore, parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { buildPlan, defaultWeekdays, type Plan, type PlanChoice } from '../core/plans';
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

export function usePlan(state: PlanState | undefined): Plan | undefined {
  return useMemo(
    () => (state ? buildPlan({ level: state.level, days: state.days, goal: state.goal }) : undefined),
    [state?.level, state?.days, state?.goal],
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

export function startPlan(choice: PlanChoice & { weekdays?: number[]; week?: number }, today: string): void {
  const plan = buildPlan(choice);
  savePlan({
    level: plan.level,
    goal: plan.goal,
    days: plan.days,
    weekdays: choice.weekdays?.length === plan.days ? choice.weekdays : defaultWeekdays(plan.days),
    week: Math.min(plan.weeks.length, Math.max(1, choice.week ?? 1)),
    weekOf: mondayOnOrBefore(today),
    moves: {},
    startedOn: today,
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
