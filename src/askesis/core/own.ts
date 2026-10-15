import type { Effort } from './effort';
import { lengthLabel, set, step, totalMinutes, type Part, type Workout } from './workouts';

/**
 * A session the runner builds for themselves: a warm-up, a set repeated (a stretch of work and, if they like, one of
 * rest), and a cool-down. It runs in the guide like any session of the plan, with the same bells and cues.
 */
export type OwnSession = {
  id: string;
  title: string;
  warmUp: number;
  repeat: number;
  work: { effort: Effort; minutes: number };
  rest?: { effort: Effort; minutes: number };
  coolDown: number;
};

export const WORK_EFFORTS: Effort[] = ['easy', 'steady', 'tempo', 'hard', 'stride'];
export const REST_EFFORTS: Effort[] = ['walk', 'recovery', 'easy'];
/** Lengths offered for a stretch, in minutes (a third of a minute is a 20-second stride). */
export const STRETCHES = [1 / 3, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30];
export const ENDS = [0, 5, 10, 15, 20];

export const isOwn = (id: string) => id.startsWith('own-');

export function newSession(id: string): OwnSession {
  return { id, title: '', warmUp: 10, repeat: 6, work: { effort: 'hard', minutes: 2 }, rest: { effort: 'recovery', minutes: 2 }, coolDown: 10 };
}

export function ownParts(session: OwnSession): Part[] {
  const parts: Part[] = [];
  if (session.warmUp > 0) parts.push(step('easy', session.warmUp, 'Warm up'));
  const work = step(session.work.effort, session.work.minutes);
  const rest = session.rest && session.rest.minutes > 0 ? step(session.rest.effort, session.rest.minutes) : undefined;
  const repeat = Math.max(1, Math.min(30, Math.round(session.repeat)));
  if (repeat === 1) parts.push(work, ...(rest ? [rest] : []));
  else parts.push(set(repeat, ...(rest ? [work, rest] : [work])));
  if (session.coolDown > 0) parts.push(step('easy', session.coolDown, 'Cool down'));
  return parts;
}

/** "6 × 2 min" style name, when the runner gives none. */
export function plainTitle(session: OwnSession): string {
  const work = lengthLabel(session.work.minutes);
  return session.repeat > 1 ? `${session.repeat} × ${work}` : `${work} run`;
}

/** The session as the guide and the session page take it. */
export function ownWorkout(session: OwnSession): Workout {
  const parts = ownParts(session);
  return {
    id: session.id,
    kind: session.repeat > 1 ? 'intervals' : 'easy',
    title: session.title.trim() || plainTitle(session),
    summary: `${lengthLabel(totalMinutes(parts))} · your own session`,
    parts,
    why: '',
    tips: [],
  };
}
