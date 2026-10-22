import { useEffect, useSyncExternalStore } from 'react';
import { scheduleBetween } from '../../askesis/data/proairetosSchedule';
import { addDays, atTime, mondayOnOrBefore, parseLocalDate } from '../../core/scheduling/dates';
import { afterNightDates, workDates } from '../../core/scheduling/workDays';
import { fitDays, fitWeek, type Fit, type Fixed, type LiftToFit, type RunKind, type RunToFit, type WorkDays } from '../../core/training/fitWeek';
import { isAdded } from './added';
import { readStore } from './read';
import { onRemoteChanges } from '../sync/syncController';

/*
 * The training week Askesis and Dynamis share: runs and strength sessions placed around the person's work and each
 * other (core/training/fitWeek.ts). Each app that is set to "Around my week" lets its sessions be placed; an app
 * on set weekdays keeps them, and the other fits around it. Every app works it out from the same records, so they
 * agree; the answer is kept on this device for the synchronous screens (`trainingWeekFit`, out of backups and sync).
 */

const CHOICE = 'proairetos.training';
const KEPT = 'trainingWeekFit';

export const WORK_DAY_CHOICES: { id: WorkDays; label: string }[] = [
  { id: 'free', label: 'Keep free' },
  { id: 'needed', label: 'If needed' },
  { id: 'any', label: 'Any day' },
];

/** How work days are treated, one choice for both apps (synced). */
export function workDayChoice(): WorkDays {
  try {
    const value = (JSON.parse(localStorage.getItem(CHOICE) ?? '{}') as { workDays?: WorkDays }).workDays;
    return value === 'needed' || value === 'any' ? value : 'free';
  } catch {
    return 'free';
  }
}

export function setWorkDayChoice(workDays: WorkDays): void {
  try {
    localStorage.setItem(CHOICE, JSON.stringify({ workDays }));
  } catch {
    // Kept for this visit only.
  }
  refreshTrainingWeek();
}

type Kept = { monday: string; from: string; fit: Fit };
const listeners = new Set<() => void>();
let keptCache: { raw: string | null; value: Kept[] } | undefined;

function readKept(): Kept[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEPT);
  } catch {
    return keptCache?.value ?? [];
  }
  if (keptCache?.raw === raw) return keptCache.value;
  let value: Kept[] = [];
  try {
    value = raw ? (JSON.parse(raw) as Kept[]) : [];
  } catch {
    value = [];
  }
  keptCache = { raw, value };
  return value;
}

function keep(entry: Kept): void {
  const others = readKept().filter((each) => each.monday !== entry.monday && each.monday >= addDays(entry.monday, -7));
  const next = [...others, entry];
  if (JSON.stringify(readKept()) === JSON.stringify(next)) return;
  try {
    localStorage.setItem(KEPT, JSON.stringify(next));
  } catch {
    keptCache = { raw: null, value: next };
  }
  listeners.forEach((listener) => listener());
}

/** The placed week holding `date`, as last worked out on this device. */
export function fittedWeek(date: string): Fit | undefined {
  return readKept().find((each) => each.monday === mondayOnOrBefore(date))?.fit;
}

type AskesisPlan = {
  id?: string;
  week: number;
  weekdays: number[];
  moves?: Record<string, string>;
  restWeek?: string;
  fit?: boolean;
  [key: string]: unknown;
};
type AskesisEntry = { date: string; workoutId?: string; activity?: string };
type DynamisSetup = { days?: number[]; fit?: boolean; aim?: string; place?: string };
type DynamisWorkout = { date: string; session: string; createdAt: string };

const RUN_KIND: Record<string, RunKind> = { long: 'long', tempo: 'hard', intervals: 'hard', hills: 'hard', 'race-pace': 'hard', race: 'hard' };

function localRecords<T>(prefix: string): T[] {
  const out: T[] = [];
  try {
    for (let at = 0; at < localStorage.length; at += 1) {
      const key = localStorage.key(at);
      if (!key?.startsWith(prefix)) continue;
      try {
        out.push(JSON.parse(localStorage.getItem(key) ?? 'null') as T);
      } catch {
        // An unreadable record is left out.
      }
    }
  } catch {
    // No storage: nothing to read.
  }
  return out.filter(Boolean);
}

function dynamisSetup(): DynamisSetup | undefined {
  try {
    const setup = JSON.parse(localStorage.getItem('dynamis:setup') ?? 'null') as DynamisSetup | null;
    return setup?.aim && setup.place && setup.days?.length ? setup : undefined;
  } catch {
    return undefined;
  }
}

/** Is any app set to fit around the week? Without one, nothing is worked out. */
async function anyFitting(): Promise<{ runs?: AskesisPlan; lifts?: DynamisSetup }> {
  const runs = isAdded('askesis') ? (await readStore<AskesisPlan>('askesisPlans')).find((record) => record.id === 'current') : undefined;
  const lifts = isAdded('dynamis') ? dynamisSetup() : undefined;
  return { runs, lifts };
}

/** Works out the week starting `monday`, placing what is still to do from `from` on, and keeps it. */
export async function fitWeekOf(monday: string, from: string, today = from): Promise<Fit | undefined> {
  const { runs: plan, lifts: setup } = await anyFitting();
  if (!plan?.fit && !setup?.fit) return undefined;
  const dates = Array.from({ length: 7 }, (_, at) => addDays(monday, at));
  const blocks = await scheduleBetween(atTime(addDays(monday, -1), '00:00'), atTime(addDays(monday, 8), '00:00'));
  const days = fitDays(monday, workDates(blocks), afterNightDates(blocks));
  const fixed: Fixed[] = [];
  const runs: RunToFit[] = [];
  const lifts: LiftToFit[] = [];

  if (plan && plan.restWeek !== monday) {
    const [{ ownPath, weekAt }, { fromOldPlan }] = await Promise.all([import('../../askesis/core/plans'), import('../../askesis/data/store')]);
    const state = fromOldPlan(plan as never);
    const later = monday > mondayOnOrBefore(today);
    const week = weekAt(ownPath(state), later ? state.week + 1 : state.week);
    const entries = (await readStore<AskesisEntry>('askesisWorkouts')).filter((entry) => dates.includes(entry.date));
    const chosen = [...state.weekdays].sort((a, b) => a - b);
    week.workouts.forEach((workout, at) => {
      const kind = RUN_KIND[workout.kind] ?? 'easy';
      const prefer = dates[chosen[at] ?? Math.min(6, at * 2)];
      const done = entries.find((entry) => entry.workoutId === workout.id);
      const moved = !later ? state.moves?.[workout.id] : undefined;
      if (done) fixed.push({ date: done.date, run: kind });
      else if (moved && dates.includes(moved)) fixed.push({ date: moved, run: kind });
      else if (plan.fit) runs.push({ id: workout.id, run: kind, prefer });
      else if (prefer >= from) fixed.push({ date: prefer, run: kind });
    });
    for (const entry of entries) if (!entry.workoutId && entry.activity === 'run') fixed.push({ date: entry.date, run: 'easy' });
  }

  if (setup?.days) {
    const done = localRecords<DynamisWorkout>('dynamis:workout:').sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const split = setup.days.length >= 4;
    const keys = split ? ['U', 'L'] : ['A', 'B'];
    const thisWeek = done.filter((workout) => dates.includes(workout.date));
    for (const workout of thisWeek) fixed.push({ date: workout.date, lift: { legs: workout.session !== 'U' } });
    const last = done[done.length - 1];
    let next = last ? (keys.indexOf(last.session) + 1) % keys.length : 0;
    const prefer = dates.filter((date) => setup.days!.includes(parseLocalDate(date).getDay()));
    const left = Math.max(0, setup.days.length - thisWeek.length);
    const open = prefer.filter((date) => date >= from && !thisWeek.some((workout) => workout.date === date));
    for (let at = 0; at < left; at += 1) {
      const key = keys[next];
      next = (next + 1) % keys.length;
      if (setup.fit) lifts.push({ id: `lift-${at}`, legs: key !== 'U', prefer: open[at] });
      else if (open[at]) fixed.push({ date: open[at], lift: { legs: key !== 'U' } });
    }
  }

  const fit = fitWeek({ days, from, runs, lifts, fixed, workDays: workDayChoice() });
  // An app on set days keeps them; its sessions are in `fixed`, so record those days too.
  const settled: Fit = {
    runs: plan?.fit ? fit.runs : {},
    lifts: setup?.fit ? fit.lifts : {},
  };
  keep({ monday, from, fit: settled });
  return settled;
}

/** This week and the next, worked out before reminders are written. */
export async function fitAhead(now: Date): Promise<void> {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const monday = mondayOnOrBefore(today);
  await fitWeekOf(monday, today);
  await fitWeekOf(addDays(monday, 7), addDays(monday, 7), today);
}

let running: Promise<unknown> | undefined;
/** Works the current week out again (after a plan, a log or the schedule changed). */
export function refreshTrainingWeek(today = new Date()): void {
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const work = () => fitWeekOf(mondayOnOrBefore(date), date).catch(() => undefined);
  running = (running ?? Promise.resolve()).then(work, work);
}

/** The placed week for screens: what is kept now, worked out again on opening, on sync and when `deps` change. */
export function useFittedWeek(date: string, deps: readonly unknown[] = []): Fit | undefined {
  const raw = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => readKept(),
  );
  useEffect(() => {
    refreshTrainingWeek();
    const off = onRemoteChanges(() => refreshTrainingWeek());
    const onShow = () => document.visibilityState === 'visible' && refreshTrainingWeek();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      off();
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [date, ...deps]);
  return raw.find((each) => each.monday === mondayOnOrBefore(date))?.fit;
}

/** The strength days placed in the week holding `date`, when that week was worked out. */
export function liftDays(date: string): readonly string[] | undefined {
  const fit = fittedWeek(date);
  return fit && Object.values(fit.lifts);
}
