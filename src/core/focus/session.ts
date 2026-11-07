/**
 * A focus session is plain arithmetic on timestamps, so it survives
 * reloads and phone sleep: nothing counts down in memory.
 */
export interface FocusSession {
  itemId?: string;
  itemTitle?: string;
  durationMs: number;
  startedAt: number;
  /** Set while paused. */
  pausedAt?: number;
  /** Total time spent paused so far. */
  pausedMs: number;
}

export const focusDurations = [10, 25, 45] as const;

export function startSession(now: number, minutes: number, item?: { id: string; title: string }): FocusSession {
  return { itemId: item?.id, itemTitle: item?.title, durationMs: minutes * 60_000, startedAt: now, pausedMs: 0 };
}

export function elapsedMs(session: FocusSession, now: number): number {
  const until = session.pausedAt ?? now;
  return Math.max(0, until - session.startedAt - session.pausedMs);
}

export function remainingMs(session: FocusSession, now: number): number {
  return Math.max(0, session.durationMs - elapsedMs(session, now));
}

export function isFinished(session: FocusSession, now: number): boolean {
  return remainingMs(session, now) === 0;
}

export function pause(session: FocusSession, now: number): FocusSession {
  return session.pausedAt ? session : { ...session, pausedAt: now };
}

export function resume(session: FocusSession, now: number): FocusSession {
  if (!session.pausedAt) return session;
  return { ...session, pausedAt: undefined, pausedMs: session.pausedMs + (now - session.pausedAt) };
}

/** Whole minutes actually spent, capped at the planned length. */
export function focusedMinutes(session: FocusSession, now: number): number {
  return Math.floor(Math.min(elapsedMs(session, now), session.durationMs) / 60_000);
}

/** "24:59" style. */
export function formatClockDown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
