/**
 * A small, device-local checkpoint for an in-progress guided session.
 * GPS coordinates are deliberately never stored; only the accumulated distance is kept.
 */
export type SessionRecovery = {
  version: 1;
  workoutId: string;
  startedAt: number;
  pausedAt?: number;
  pausedFor: number;
  meters: number;
  intention?: string;
  finished: boolean;
  savedAt: number;
};

const KEY = 'askesis:session-recovery';
const MAX_AGE = 24 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function valid(value: unknown): value is SessionRecovery {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<SessionRecovery>;
  return draft.version === 1 &&
    typeof draft.workoutId === 'string' && draft.workoutId.length > 0 &&
    Number.isFinite(draft.startedAt) &&
    (draft.pausedAt === undefined || Number.isFinite(draft.pausedAt)) &&
    Number.isFinite(draft.pausedFor) && (draft.pausedFor ?? -1) >= 0 &&
    Number.isFinite(draft.meters) && (draft.meters ?? -1) >= 0 &&
    typeof draft.finished === 'boolean' &&
    Number.isFinite(draft.savedAt);
}

export function readSessionRecovery(now = Date.now(), target = storage()): SessionRecovery | undefined {
  if (!target) return undefined;
  try {
    const raw = target.getItem(KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed) || now - parsed.savedAt > MAX_AGE || parsed.savedAt > now + 60_000) {
      target.removeItem(KEY);
      return undefined;
    }
    return parsed;
  } catch {
    try { target.removeItem(KEY); } catch { /* Storage may be unavailable. */ }
    return undefined;
  }
}

export function saveSessionRecovery(draft: SessionRecovery, target = storage()): void {
  if (!target) return;
  try {
    target.setItem(KEY, JSON.stringify(draft));
  } catch {
    // A full or unavailable device store must not interrupt the workout.
  }
}

export function clearSessionRecovery(target = storage()): void {
  if (!target) return;
  try { target.removeItem(KEY); } catch { /* Storage may be unavailable. */ }
}

/** Restores elapsed time at the last checkpoint and pauses safely at recovery time. */
export function pauseRecoveredSession(draft: SessionRecovery, now = Date.now()): SessionRecovery {
  const pausedSince = draft.pausedAt ?? draft.savedAt;
  return {
    ...draft,
    pausedAt: now,
    pausedFor: draft.pausedFor + Math.max(0, now - pausedSince),
    savedAt: now,
  };
}
