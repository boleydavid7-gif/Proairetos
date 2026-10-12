import { addDays } from '../../core/scheduling/dates';
import type { Plant } from './plants';

/*
 * The forecast for plants outside: frost at night and hot days. Frost (2 °C or below, the usual frost-warning
 * line, as at ground level it is colder than the air) can kill tender plants in one night; on hot days pots dry
 * fast, so plants outside come round a day sooner. Plain words, the person decides what to do.
 */

/** Lowest and highest temperature by day, in °C. */
export type Forecast = Record<string, { min: number; max: number }>;

export const FROST_C = 2;
export const HOT_C = 30;

/** Days at or above the hot line, for `nextCheck`. */
export function hotDays(forecast: Forecast): string[] {
  return Object.keys(forecast).filter((day) => forecast[day].max >= HOT_C).sort();
}

/** Frost tonight: the coldest of tomorrow's early hours, if at or below the frost line, with the plants outside. */
export function frostTonight(plants: readonly Plant[], forecast: Forecast, today: string): { min: number; plants: Plant[] } | undefined {
  const night = forecast[addDays(today, 1)];
  const outside = plants.filter((plant) => plant.outside);
  if (!night || night.min > FROST_C || !outside.length) return undefined;
  return { min: night.min, plants: outside };
}

/** Hot today: the day's highest, if at or above the hot line, with the plants outside. */
export function hotToday(plants: readonly Plant[], forecast: Forecast, today: string): { max: number; plants: Plant[] } | undefined {
  const day = forecast[today];
  const outside = plants.filter((plant) => plant.outside);
  if (!day || day.max < HOT_C || !outside.length) return undefined;
  return { max: day.max, plants: outside };
}

/** "1 °C", "34 °F". */
export function degrees(celsius: number, unit: 'C' | 'F' = 'C'): string {
  return unit === 'F' ? `${Math.round(celsius * 1.8 + 32)} °F` : `${Math.round(celsius)} °C`;
}

/** Days away from home, both ends included. */
export type Away = { from: string; to: string };

export function isAway(away: Away | undefined, day: string): boolean {
  return Boolean(away && day >= away.from && day <= away.to);
}
