import { useEffect, useState } from 'react';
import type { LogEntry } from '../../askesis/core/log';
import { activities } from '../../askesis/core/log';
import { asToday } from '../../askesis/core/gentler';
import { formatDistance, formatDuration, type Unit } from '../../askesis/core/pace';
import { buildPath, weekAt } from '../../askesis/core/plans';
import { layOut } from '../../askesis/core/week';
import { addDays, atTime, mondayOnOrBefore as mondayOf, toLocalDate } from '../../core/scheduling/dates';
import type { RunTime } from '../../core/notify/notices';
import { lengthLabel, totalMinutes, type Workout } from '../../askesis/core/workouts';
import { fromOldPlan, type PlanState } from '../../askesis/data/store';
import { stores } from '../../data/storage/indexeddb/database';
import { deviceDatabase } from '../services';
import { onRemoteChanges } from '../sync/syncController';

/**
 * Askesis, the training app, keeps its runs in this same database. Proairetos
 * only reads them, so one life is recorded in one place: today's session on
 * Today, finished runs in Done today and Reflect.
 */
export type Runs = { plan?: PlanState; workouts: LogEntry[]; unit: Unit };

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) return resolve([]);
    const request = db.transaction(store, 'readonly').objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => resolve([]);
  });
}

function unit(): Unit {
  try {
    return (JSON.parse(localStorage.getItem('askesis:settings') ?? '{}') as { unit?: Unit }).unit ?? 'km';
  } catch {
    return 'km';
  }
}

export async function readRuns(): Promise<Runs> {
  const db = await deviceDatabase;
  if (!db) return { workouts: [], unit: unit() };
  const [workouts, plans] = await Promise.all([
    readAll<LogEntry>(db, stores.askesisWorkouts),
    readAll<PlanState & { id: string }>(db, stores.askesisPlans),
  ]);
  const record = plans.find((each) => each.id === 'current');
  return { workouts, plan: record && fromOldPlan(record as PlanState & { week: number }), unit: unit() };
}

/** Kept fresh when a sync brings runs from elsewhere, or on coming back to the app. */
export function useRuns(): Runs | undefined {
  const [runs, setRuns] = useState<Runs>();
  useEffect(() => {
    let live = true;
    const load = () => void readRuns().then((next) => live && setRuns(next));
    load();
    const off = onRemoteChanges(load);
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      live = false;
      off();
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return runs;
}

/** Today's planned session, if there is one and it is not done yet. */
export function todaysRun(runs: Runs | undefined, today: string): Workout | undefined {
  const state = runs?.plan;
  if (!state) return undefined;
  const plan = buildPath({
    aim: state.aim,
    days: state.days,
    gentler: state.gentler,
    raceDate: state.raceDate,
    joinWeek: state.joinWeek,
    today: state.startedOn,
  });
  // A rest week the person chose: nothing planned.
  if (state.restWeek === mondayOf(today)) return undefined;
  const week = weekAt(plan, state.week);
  const day = layOut(week, today, state.weekdays, state.moves, runs.workouts.filter((entry) => entry.date === today)).find(
    (each) => each.date === today && !each.done,
  );
  return day && asToday(day.workout, state.lighter, today);
}

/**
 * Run days in this week and the next, at the time the runner chose, for
 * reminders. This week's sessions by name; next week's week is theirs to
 * choose, so those are only "Run day".
 */
export function runTimes(runs: Runs, now: Date, until: Date): RunTime[] {
  const state = runs.plan;
  if (!state?.runAt) return [];
  const plan = buildPath({
    aim: state.aim,
    days: state.days,
    gentler: state.gentler,
    raceDate: state.raceDate,
    joinWeek: state.joinWeek,
    today: state.startedOn,
  });
  const today = toLocalDate(now);
  const thisMonday = mondayOf(today);
  const out: RunTime[] = [];
  for (let day = today; atTime(day, '00:00') < until; day = addDays(day, 1)) {
    const monday = mondayOf(day);
    if (monday > addDays(thisMonday, 7)) break;
    if (state.restWeek === monday) continue;
    const later = monday !== thisMonday;
    const week = weekAt(plan, later ? state.week + 1 : state.week);
    const session = layOut(week, day, state.weekdays, later ? {} : state.moves, runs.workouts).find(
      (each) => each.date === day && !each.done,
    );
    if (!session) continue;
    const workout = asToday(session.workout, state.lighter, day);
    out.push({
      key: `${day}:${state.runAt}`,
      at: atTime(day, state.runAt),
      title: later ? 'Run day' : [workout.title, runLength(workout)].filter(Boolean).join(' · '),
      place: state.place,
    });
  }
  return out;
}

export function runLength(workout: Workout): string {
  return workout.kind === 'race' ? '' : lengthLabel(totalMinutes(workout.parts));
}

/** "Easy run · 3.1 mi · 26:14". */
export function runTitle(entry: LogEntry, distanceUnit: Unit): string {
  return [
    entry.workoutTitle ?? activities[entry.activity],
    entry.meters ? formatDistance(entry.meters, distanceUnit) : undefined,
    entry.seconds ? formatDuration(entry.seconds) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}
