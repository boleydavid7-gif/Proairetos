import { describe, expect, it } from 'vitest';
import { awayDays, exerciseId, fullSets, lighterWeight, newSetup, nextSession, nextWeight, range, restFor, sessionMinutes, sessionsFor, setsOffer, targetsFor, weekDays, WHY, SOURCES, type Setup, type Workout } from './plan';
import { EXERCISES, LADDERS, type Pattern } from './library';
import { ROUTINES, routineMinutes, stepsOf, weekMobility } from './mobility';

const setup = (patch: Partial<Setup> = {}): Setup => ({ ...newSetup({ aim: 'health', place: 'gym', isNew: true, days: [1, 4], unit: 'kg' }, '2026-10-01'), ...patch });
const workout = (date: string, session: string, exercises: Workout['exercises'], id = date): Workout => ({ id, date, session, exercises, createdAt: `${date}T18:00:00.000Z` });

const MAJOR: Pattern[] = ['squat', 'hinge', 'push', 'pull', 'press', 'pulldown'];

describe('the week', () => {
  it('reaches every major movement at least twice a week, whatever the number of days', () => {
    for (const days of [[1, 4], [1, 3, 5], [1, 2, 4, 5]]) {
      const sessions = sessionsFor({ days });
      // Each weekday takes the next session in turn: count each pattern over a week.
      const counts = new Map<string, number>();
      days.forEach((_, index) => sessions[index % sessions.length].patterns.forEach((pattern) => counts.set(pattern, (counts.get(pattern) ?? 0) + 1)));
      const legs = (counts.get('squat') ?? 0) + (counts.get('hinge') ?? 0) + (counts.get('single') ?? 0);
      const pushing = (counts.get('push') ?? 0) + (counts.get('press') ?? 0);
      const pulling = (counts.get('pull') ?? 0) + (counts.get('pulldown') ?? 0);
      expect(Math.min(legs, pushing, pulling)).toBeGreaterThanOrEqual(2);
    }
  });

  it('takes the sessions in turn, whatever day the last was done', () => {
    const plan = setup();
    expect(nextSession(plan, []).key).toBe('A');
    expect(nextSession(plan, [workout('2026-10-02', 'A', [])]).key).toBe('B');
    expect(nextSession(plan, [workout('2026-10-02', 'A', []), workout('2026-10-09', 'B', [])]).key).toBe('A');
  });

  it('lists the planned days of the week, Monday first', () => {
    expect(weekDays({ days: [1, 4] }, '2026-10-08')).toEqual(['2026-10-05', '2026-10-08']);
    expect(weekDays({ days: [0] }, '2026-10-08')).toEqual(['2026-10-11']);
  });
});

describe('sets, repetitions and rest', () => {
  it('starts with two sets when new, three otherwise', () => {
    expect(setup().sets).toBe(2);
    expect(newSetup({ aim: 'strength', place: 'gym', isNew: false, days: [1, 4], unit: 'kg' }, '2026-10-01').sets).toBe(3);
  });

  it('uses fewer, heavier repetitions for strength and a middle range otherwise', () => {
    expect(range({ aim: 'strength', isNew: false }, 'reps')).toEqual([4, 6]);
    expect(range({ aim: 'muscle', isNew: false }, 'reps')).toEqual([8, 12]);
    expect(range({ aim: 'health', isNew: true }, 'reps')).toEqual([10, 15]);
    expect(range({ aim: 'health', isNew: true }, 'seconds')).toEqual([20, 45]);
  });

  it('rests longer for the big lifts and for strength', () => {
    expect(restFor('strength', true)).toBe(180);
    expect(restFor('muscle', false)).toBe(90);
    expect(restFor('health', true)).toBeGreaterThan(restFor('health', false));
  });

  it('offers one more set after six sessions, up to about ten a muscle a week for growing muscle', () => {
    const plan = setup({ setsSince: '2026-10-01' });
    const six = Array.from({ length: 6 }, (_, index) => workout(`2026-10-${String(index + 2).padStart(2, '0')}`, 'A', [], `w${index}`));
    expect(setsOffer(plan, six.slice(0, 5))).toBeUndefined();
    expect(setsOffer(plan, six)).toBe(3);
    expect(setsOffer({ ...plan, sets: 3 }, six)).toBeUndefined();
    expect(fullSets({ aim: 'muscle', days: [1, 4] })).toBe(4);
    // Four sets of two exercises for a muscle, twice a week, is about ten: 4 × 2 sessions + the other patterns that share it.
    expect(fullSets({ aim: 'muscle', days: [1, 3, 5] }) * 3).toBeGreaterThanOrEqual(9);
  });

  it('keeps sessions to a sensible length', () => {
    const targets = targetsFor(setup(), sessionsFor(setup())[0], []);
    const minutes = sessionMinutes(targets);
    expect(minutes).toBeGreaterThanOrEqual(20);
    expect(minutes).toBeLessThanOrEqual(60);
  });
});

describe('progression', () => {
  it('offers about 5 percent more, at least one step, within 2 to 10 percent', () => {
    for (const weight of [10, 20, 40, 60, 100, 140]) {
      const next = nextWeight(weight, 'back-squat', 'kg');
      const jump = (next - weight) / weight;
      expect(next).toBeGreaterThan(weight);
      if (weight >= 25) expect(jump).toBeLessThanOrEqual(0.1);
      if (weight >= 25) expect(jump).toBeGreaterThanOrEqual(0.02);
    }
    expect(nextWeight(12, 'goblet-squat', 'kg')).toBe(14);
    expect(nextWeight(25, 'goblet-squat', 'lb')).toBe(30);
  });

  it('offers more only when every set reached the top of the range', () => {
    const plan = setup({ aim: 'muscle', isNew: false, sets: 3 });
    const session = sessionsFor(plan)[0];
    const squat = exerciseId(plan, 'squat');
    const short = [workout('2026-10-05', 'A', [{ exercise: squat, name: 'Squat', sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 12 }, { weight: 40, reps: 10 }] }])];
    expect(targetsFor(plan, session, short)[0].ready).toBeUndefined();
    expect(targetsFor(plan, session, short)[0].weight).toBe(40);
    const full = [workout('2026-10-05', 'A', [{ exercise: squat, name: 'Squat', sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 12 }, { weight: 40, reps: 12 }] }])];
    expect(targetsFor(plan, session, full)[0].ready).toEqual({ weight: 42.5 });
  });

  it('moves a bodyweight exercise up its ladder in place of weight', () => {
    const plan = setup({ place: 'body', steps: { 'bw-push': 1 } });
    const session = sessionsFor(plan)[0];
    const push = targetsFor(plan, session, [])[1];
    expect(push.name).toBe(LADDERS['bw-push'][1].name);
    const done = [workout('2026-10-05', 'A', [{ exercise: 'bw-push', step: 1, name: push.name, sets: [{ reps: 15 }, { reps: 15 }] }])];
    expect(targetsFor(plan, session, done)[1].ready).toEqual({ step: 2, name: 'Knee push-up' });
  });

  it('offers a lighter start after two weeks away', () => {
    expect(awayDays([workout('2026-09-20', 'A', [])], '2026-10-01')).toBeUndefined();
    expect(awayDays([workout('2026-09-10', 'A', [])], '2026-10-01')).toBe(21);
    expect(lighterWeight(50, 'back-squat', 'kg')).toBe(45);
  });
});

describe('the library and sources', () => {
  it('has an exercise for every pattern in every place', () => {
    for (const place of ['gym', 'home', 'body'] as const) {
      for (const pattern of [...MAJOR, 'single', 'core'] as Pattern[]) {
        const id = exerciseId(setup({ place }), pattern);
        expect(EXERCISES[id] ?? LADDERS[id]).toBeTruthy();
      }
    }
  });

  it('cites a source for every rule', () => {
    expect(WHY.every((line) => SOURCES[line.source])).toBe(true);
  });
});

describe('mobility', () => {
  it('keeps each routine to a few minutes, both sides counted', () => {
    for (const routine of ROUTINES) {
      expect(routineMinutes(routine)).toBeGreaterThanOrEqual(3);
      expect(routineMinutes(routine)).toBeLessThanOrEqual(10);
    }
    expect(stepsOf(ROUTINES[0]).filter((step) => step.side).length % 2).toBe(0);
  });

  it('gives the week as facts', () => {
    expect(weekMobility([{ id: '1', date: '2026-10-05', routine: 'morning', minutes: 5, createdAt: '' }, { id: '2', date: '2026-10-05', routine: 'after', minutes: 6, createdAt: '' }], ['2026-10-05', '2026-10-06'])).toEqual({ days: 1, minutes: 11 });
  });
});

describe('warm-ups and run days', () => {
  it('offers two warm-up sets for a big lift with weight, none otherwise', async () => {
    const { warmUp, fromRunDays } = await import('./plan');
    expect(warmUp({ exercise: 'back-squat', loaded: true, weight: 60, big: true }, 'kg')).toEqual([{ weight: 30, reps: 8 }, { weight: 45, reps: 4 }]);
    expect(warmUp({ exercise: 'cable-row', loaded: true, weight: 40, big: false }, 'kg')).toEqual([]);
    expect(warmUp({ exercise: 'goblet-squat', loaded: true, weight: 4, big: true }, 'kg')).toEqual([{ weight: 2, reps: 8 }]);
    expect(fromRunDays([0, 2, 6])).toEqual([1, 3, 0]);
  });
});
