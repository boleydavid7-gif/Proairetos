import { newSession, ownParts, ownWorkout, plainTitle } from '../../askesis/core/own';
import { totalMinutes, flatten, set, step } from '../../askesis/core/workouts';

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

  it('uses an ordered custom sequence with repeat groups', () => {
    const session = {
      ...newSession('own-3'),
      title: 'Progression intervals',
      parts: [
        step('easy', 10, 'Warm up'),
        set(4, step('tempo', 3), step('recovery', 2)),
        step('steady', 5),
        step('easy', 5, 'Cool down'),
      ],
    };
    expect(ownParts(session)).toEqual(session.parts);
    expect(totalMinutes(ownParts(session))).toBe(38);
    expect(flatten(ownParts(session)).map((part) => part.effort)).toEqual([
      'easy', 'tempo', 'recovery', 'tempo', 'recovery', 'tempo', 'recovery', 'tempo', 'recovery', 'steady', 'easy',
    ]);
    expect(ownWorkout(session)).toMatchObject({ id: 'own-3', kind: 'intervals', title: 'Progression intervals' });
  });

  it('keeps older saved sessions working when no custom sequence exists', () => {
    const legacy = newSession('own-4');
    expect(ownParts(legacy)).toHaveLength(3);
    expect(totalMinutes(ownParts(legacy))).toBe(44);
    expect(ownWorkout(legacy).kind).toBe('intervals');
  });
});
