import { describe, expect, it } from 'vitest';
import { clearSessionRecovery, pauseRecoveredSession, readSessionRecovery, saveSessionRecovery, type SessionRecovery } from '../../askesis/core/sessionRecovery';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const draft = (overrides: Partial<SessionRecovery> = {}): SessionRecovery => ({
  version: 1,
  workoutId: 'steady-01',
  startedAt: 1_000,
  pausedFor: 0,
  meters: 2_500,
  intention: 'Easy and relaxed',
  finished: false,
  savedAt: 11_000,
  ...overrides,
});

describe('guided session recovery', () => {
  it('saves and reads an unfinished session on the same device', () => {
    const store = memoryStorage();
    saveSessionRecovery(draft(), store);
    expect(readSessionRecovery(12_000, store)).toMatchObject({ workoutId: 'steady-01', meters: 2_500, intention: 'Easy and relaxed' });
  });

  it('restores an active session paused at its last checkpoint', () => {
    const saved = draft();
    const recovered = pauseRecoveredSession(saved, 21_000);
    expect(recovered.pausedAt).toBe(21_000);
    expect(recovered.pausedFor).toBe(10_000);
    expect(21_000 - recovered.startedAt - recovered.pausedFor).toBe(10_000);
  });

  it('preserves a session that was already paused', () => {
    const saved = draft({ pausedAt: 6_000, pausedFor: 2_000 });
    const recovered = pauseRecoveredSession(saved, 21_000);
    expect(recovered.pausedFor).toBe(17_000);
    expect(21_000 - recovered.startedAt - recovered.pausedFor).toBe(3_000);
  });

  it('discards stale or malformed checkpoints', () => {
    const store = memoryStorage();
    saveSessionRecovery(draft(), store);
    expect(readSessionRecovery(11_000 + 24 * 60 * 60 * 1000 + 1, store)).toBeUndefined();
    saveSessionRecovery(draft(), store);
    store.setItem('askesis:session-recovery', '{broken');
    expect(readSessionRecovery(12_000, store)).toBeUndefined();
  });

  it('clears a checkpoint after the user discards or logs it', () => {
    const store = memoryStorage();
    saveSessionRecovery(draft(), store);
    clearSessionRecovery(store);
    expect(readSessionRecovery(12_000, store)).toBeUndefined();
  });
});
