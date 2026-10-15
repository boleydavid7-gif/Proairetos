import { newSession, ownParts, ownWorkout, plainTitle } from '../../askesis/core/own';
import { totalMinutes, flatten } from '../../askesis/core/workouts';

describe('your own sessions', () => {
  it('lays out warm-up, the repeats and cool-down for the guide', () => {
    const session = newSession('own-1');
    const parts = ownParts(session);
    expect(totalMinutes(parts)).toBe(10 + 6 * (2 + 2) + 10);
    expect(flatten(parts).map((step) => step.effort).slice(0, 3)).toEqual(['easy', 'hard', 'recovery']);
    expect(ownWorkout(session)).toMatchObject({ id: 'own-1', kind: 'intervals', title: '6 × 2 min' });
  });

  it('takes a session with no rest, no warm-up and one stretch', () => {
    const session = { ...newSession('own-2'), warmUp: 0, coolDown: 0, repeat: 1, rest: undefined, work: { effort: 'tempo' as const, minutes: 20 }, title: 'Tempo Tuesday' };
    expect(ownParts(session)).toEqual([{ effort: 'tempo', minutes: 20, note: undefined }]);
    expect(ownWorkout(session).title).toBe('Tempo Tuesday');
    expect(plainTitle(session)).toBe('20 min run');
  });
});
