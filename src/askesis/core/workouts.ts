import { efforts, type Effort } from './effort';

/** One stretch at one effort. Minutes may be fractional (a 20-second stride is 1/3). */
export type Step = { effort: Effort; minutes: number; note?: string };
/** A set repeated: "6 x (3 min hard, 2 min easy)". */
export type Set = { repeat: number; steps: Step[] };
export type Part = Step | Set;

export type WorkoutKind =
  | 'walk-run'
  | 'easy'
  | 'strides'
  | 'long'
  | 'tempo'
  | 'intervals'
  | 'hills'
  | 'race-pace'
  | 'walk'
  | 'race';

export type Workout = {
  id: string;
  kind: WorkoutKind;
  title: string;
  /** One line under the title. */
  summary: string;
  parts: Part[];
  /** Why this session is here, in plain words. */
  why: string;
  tips: string[];
};

export const isSet = (part: Part): part is Set => 'repeat' in part;

export const step = (effort: Effort, minutes: number, note?: string): Step => ({ effort, minutes, note });
export const set = (repeat: number, ...steps: Step[]): Set => ({ repeat, steps });

/** Every step in order, with sets unrolled; what the guide walks through. */
export function flatten(parts: readonly Part[]): Step[] {
  return parts.flatMap((part) =>
    isSet(part) ? Array.from({ length: part.repeat }, () => part.steps).flat() : [part],
  );
}

export function totalMinutes(parts: readonly Part[]): number {
  return flatten(parts).reduce((sum, item) => sum + item.minutes, 0);
}

/** Minutes at each effort, for the balance of easy and hard. */
export function minutesByEffort(parts: readonly Part[]): Record<Effort, number> {
  const out = { walk: 0, recovery: 0, easy: 0, steady: 0, tempo: 0, hard: 0, stride: 0 } as Record<Effort, number>;
  for (const item of flatten(parts)) out[item.effort] += item.minutes;
  return out;
}

export function intenseMinutes(parts: readonly Part[]): number {
  return flatten(parts)
    .filter((item) => efforts[item.effort].intense)
    .reduce((sum, item) => sum + item.minutes, 0);
}

/** "25 min", "1 h 10 min", "20 s". */
export function lengthLabel(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "Easy 10 min", "6 x (Hard 3 min, Easy 2 min)". */
export function partLabel(part: Part): string {
  if (isSet(part)) return `${part.repeat} x (${part.steps.map(partLabel).join(', ')})`;
  return `${efforts[part.effort].name} ${lengthLabel(part.minutes)}`;
}

/** The effort most of the session asks for, for its one-line description. */
export function mainEffort(parts: readonly Part[]): Effort {
  const byEffort = minutesByEffort(parts);
  const harder = (['hard', 'tempo', 'steady', 'stride'] as Effort[]).find((effort) => byEffort[effort] > 0);
  if (harder) return harder;
  return byEffort.easy >= byEffort.walk ? 'easy' : 'walk';
}
