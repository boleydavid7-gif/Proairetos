import type { HealthReading, HealthSleep, HealthWater, HealthWorkout } from './autoExport';

/*
 * What is new from Apple Health for each app: never something already there. A workout already logged by hand, from a
 * watch file or from Strava (same day and kind, about the same distance or length) is left alone; a night the person
 * wrote in Diaita is theirs and stays; water and readings carry Health's own ids, so a day's total that grew replaces
 * the one brought in before.
 */

export const HEALTH_ID = 'health-';

type Logged = { id: string; date: string; activity: string; meters?: number; seconds?: number };

export function newWorkouts(workouts: readonly HealthWorkout[], log: readonly Logged[]): HealthWorkout[] {
  const added: HealthWorkout[] = [];
  for (const workout of workouts) {
    const all = [...log, ...added.map((each) => ({ id: HEALTH_ID + each.id, date: each.date, activity: each.type, meters: each.meters, seconds: each.seconds }))];
    const there = all.some(
      (entry) =>
        entry.id === HEALTH_ID + workout.id ||
        (entry.date === workout.date &&
          entry.activity === workout.type &&
          ((entry.meters !== undefined && workout.meters !== undefined && Math.abs(entry.meters - workout.meters) <= Math.max(150, workout.meters * 0.03)) ||
            (entry.seconds !== undefined && workout.seconds !== undefined && Math.abs(entry.seconds - workout.seconds) <= 120))),
    );
    if (!there) added.push(workout);
  }
  return added;
}

type Night = { date: string; bed: string; up: string; from?: string };

/** Nights to write: a day with nothing yet, or one brought in from Health before that has changed. */
export function nightsToWrite(nights: readonly HealthSleep[], kept: readonly Night[]): HealthSleep[] {
  return nights.filter((night) => {
    const there = kept.find((each) => each.date === night.date);
    return !there || (there.from === 'health' && (there.bed !== night.bed || there.up !== night.up));
  });
}

/** Records (water, readings) to write: new ids, or ones whose amount changed since. */
export function changedRecords<T extends HealthWater | HealthReading>(records: readonly T[], kept: readonly { id: string; same: (record: T) => boolean }[]): T[] {
  return records.filter((record) => {
    const there = kept.find((each) => each.id === HEALTH_ID + record.id);
    return !there || !there.same(record);
  });
}

export const OZ_PER_ML = 1 / 29.5735;

/** "1 run, 2 nights' sleep, water on 3 days" style counts, for the line that says what came in. */
export function broughtInText(counts: { workouts: number; sleep: number; water: number; readings: number }): string {
  const parts: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (counts.workouts) parts.push(plural(counts.workouts, 'workout', 'workouts'));
  if (counts.sleep) parts.push(plural(counts.sleep, 'night of sleep', 'nights of sleep'));
  if (counts.water) parts.push(plural(counts.water, 'drink of water', 'drinks of water'));
  if (counts.readings) parts.push(plural(counts.readings, 'reading', 'readings'));
  return parts.length ? `From Apple Health: ${parts.join(', ')}` : '';
}
