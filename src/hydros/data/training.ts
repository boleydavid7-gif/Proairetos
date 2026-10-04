import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import type { Drink } from '../core/drinks';
import { localDate } from '../core/drinks';

type TrainingPlan = { weekdays?: unknown; weekOf?: unknown; moves?: unknown };
type TrainingEntry = { date?: unknown; activity?: unknown; seconds?: unknown; workoutId?: unknown };

export type TrainingToday = {
  runDay: boolean;
  loggedRun: boolean;
  minutes?: number;
};

let opened: Promise<IDBDatabase | undefined> | undefined;
const db = () => (opened ??= openDatabase().catch(() => undefined));

async function all<T>(store: string): Promise<T[]> {
  const database = await db();
  if (!database || !database.objectStoreNames.contains(store)) return [];
  return new Promise<T[]>((resolve) => {
    const request = database.transaction(store, 'readonly').objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => resolve([]);
  });
}

/** Reads the shared Askesis records without copying them into Hydros. */
export async function trainingToday(date = new Date()): Promise<TrainingToday> {
  const today = localDate(date);
  const weekday = (date.getDay() + 6) % 7;
  const plans = await all<TrainingPlan>(stores.askesisPlans);
  const plan = plans.find((item) => item && typeof item === 'object');
  const weekdays = Array.isArray(plan?.weekdays) ? plan.weekdays.filter((item): item is number => Number.isInteger(item)) : [];
  const planned = weekdays.includes(weekday);
  const entries = await all<TrainingEntry>(stores.askesisWorkouts);
  const runs = entries.filter((entry) => entry.date === today && (entry.activity === 'run' || Boolean(entry.workoutId)));
  const minutes = runs.reduce((sum, entry) => sum + (typeof entry.seconds === 'number' && entry.seconds > 0 ? entry.seconds / 60 : 0), 0);
  return { runDay: planned || runs.length > 0, loggedRun: runs.length > 0, minutes: minutes > 0 ? minutes : undefined };
}

export function rangeForTraining(base: { usualMinOz: number; usualMaxOz: number }, training: TrainingToday): { min: number; max: number; extra: number } {
  if (!training.runDay) return { min: base.usualMinOz, max: base.usualMaxOz, extra: 0 };
  const extra = training.minutes && training.minutes >= 60 ? 16 : 8;
  return { min: base.usualMinOz + extra, max: base.usualMaxOz + extra, extra };
}

export function hasTrainingData(drinks: readonly Drink[], training: TrainingToday): boolean {
  return training.runDay || drinks.length > 0;
}
