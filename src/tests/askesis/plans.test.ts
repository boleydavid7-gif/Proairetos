import { fromOldPlan } from '../../askesis/data/store';
import { moreGradual } from '../../askesis/core/progress';
import {
  aimWords,
  buildPath,
  joinFor,
  lastWeekOf,
  ownPath,
  placementFor,
  suggestedLevel,
  joinWeekFor,
  weekAt,
  weekMinutes,
  type Aim,
  type Plan,
} from '../../askesis/core/plans';
import { flatten, intenseMinutes, minutesByEffort, totalMinutes } from '../../askesis/core/workouts';
import { estimatedMax, heartRange, zoneRanges } from '../../askesis/core/zones';

const aims: Aim[] = [
  { kind: 'time', minutes: 20 },
  { kind: 'time', minutes: 30 },
  { kind: 'time', minutes: 45 },
  { kind: 'time', minutes: 90 },
  { kind: 'distance', meters: 1609.344 },
  { kind: 'distance', meters: 5000 },
  { kind: 'distance', meters: 16093.44 },
  { kind: 'distance', meters: 8000 },
  { kind: 'distance', meters: 10000 },
  { kind: 'distance', meters: 21097.5 },
  { kind: 'distance', meters: 42195 },
  { kind: 'steady' },
];

function everyPath(): Plan[] {
  const paths: Plan[] = [];
  for (const aim of aims) for (const days of [3, 4, 5, 6]) for (const gentler of [false, true]) paths.push(buildPath({ aim, days, gentler }));
  return paths;
}
const paths = everyPath();
const label = (plan: Plan, n: number) => `${plan.id} week ${n}`;

describe('paths toward an aim', () => {
  it('begins every path with the same ten walk-run weeks', () => {
    for (const plan of paths) {
      const start = plan.weeks.filter((week) => week.stage === 'Start' || (week.n <= 10 && week.stage === 'Your aim'));
      expect(start.length).toBeGreaterThanOrEqual(Math.min(8, plan.weeks.length));
      const first = flatten(plan.weeks[0].workouts[0].parts).filter((step) => step.effort === 'easy');
      expect(Math.max(...first.map((step) => step.minutes))).toBe(1);
    }
  });

  it('has a session for each chosen day, every week', () => {
    for (const plan of paths) for (const week of plan.weeks) expect(week.workouts.length, label(plan, week.n)).toBe(plan.days);
  });

  it('gives every session a unique id', () => {
    for (const plan of paths) {
      const ids = plan.weeks.flatMap((week) => week.workouts.map((workout) => workout.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('keeps hard running to a fifth of the week or less (about 80/20)', () => {
    for (const plan of paths)
      for (const week of plan.weeks) {
        const total = weekMinutes(week);
        const hard = week.workouts.reduce((sum, workout) => sum + intenseMinutes(workout.parts), 0);
        const steady = week.workouts.reduce((sum, workout) => sum + minutesByEffort(workout.parts).steady, 0);
        expect(hard / total, label(plan, week.n)).toBeLessThanOrEqual(0.2);
        expect((hard + steady) / total, label(plan, week.n)).toBeLessThanOrEqual(0.3);
      }
  });

  it('grows weekly time by under 10% over the busiest recent week, after the start', () => {
    for (const plan of paths) {
      const minutes = plan.weeks.map(weekMinutes);
      const after = plan.weeks.findIndex((week) => week.stage !== 'Start');
      for (let i = Math.max(1, after); i < plan.weeks.length; i += 1) {
        if (['Taper', 'Your aim'].includes(plan.weeks[i].stage)) continue;
        const before = Math.max(...minutes.slice(Math.max(0, i - 3), i));
        // Sessions come in fives, so a small week can step half of five minutes past 10%.
        expect(minutes[i], label(plan, i + 1)).toBeLessThanOrEqual(before * 1.1 + 2.5);
      }
    }
  });

  // Single runs much longer than the longest of the past month carry more injury risk (Frandsen et al., BJSM 2025).
  it('never makes one run more than about 10% longer than the longest of the four weeks before', () => {
    const running = (parts: Parameters<typeof flatten>[0]) => flatten(parts).filter((s) => s.effort !== 'walk').reduce((t, s) => t + s.minutes, 0);
    for (const plan of paths) {
      const longest = plan.weeks.map((week) => Math.max(...week.workouts.filter((w) => w.kind !== 'race').map((w) => running(w.parts))));
      // The walk-run start is short bouts of running between walks; the rule holds from the first continuous running on.
      for (let i = 1; i < plan.weeks.length; i += 1) {
        if (plan.weeks[i].stage === 'Start') continue;
        const before = Math.max(...longest.slice(Math.max(0, i - 4), i));
        expect(longest[i], label(plan, i + 1)).toBeLessThanOrEqual(Math.max(before + 5, before * 1.1) + 0.01);
      }
    }
  });

  it('keeps the long run to about 40% of the week (45% on three days), and under two and a half hours', () => {
    for (const plan of paths)
      for (const week of plan.weeks) {
        if (week.stage === 'Start' || week.stage === 'Your aim' || week.easier) continue;
        const longest = Math.max(...week.workouts.map((w) => totalMinutes(w.parts)));
        expect(longest, label(plan, week.n)).toBeLessThanOrEqual(150);
        // About 40%: sessions come in fives, so a week can sit up to half of five minutes over.
        expect(longest, label(plan, week.n)).toBeLessThanOrEqual(weekMinutes(week) * (plan.days <= 3 ? 0.45 : 0.4) + 2.5);
      }
  });

  it('has no more than two harder sessions a week, a long run with race or steady effort counting as one', () => {
    for (const plan of paths)
      for (const week of plan.weeks) {
        const harder = week.workouts.filter((w) => intenseMinutes(w.parts) > 0 || minutesByEffort(w.parts).steady > 0);
        expect(harder.length, label(plan, week.n)).toBeLessThanOrEqual(2);
      }
  });

  it('has an easier week regularly once it grows', () => {
    for (const plan of paths) {
      const growing = plan.weeks.filter((week) => week.n > 10 && ['Base', 'Build'].includes(week.stage));
      if (growing.length >= 4) expect(growing.some((week) => week.easier), plan.id).toBe(true);
    }
  });

  it('rounds every session to five minutes, and never repeats one within a week', () => {
    for (const plan of paths)
      for (const week of plan.weeks) {
        for (const workout of week.workouts) {
          if (workout.kind === 'race') continue;
          expect((Math.round(totalMinutes(workout.parts) * 60) / 60) % 5, workout.id).toBe(0);
        }
        const shapes = week.workouts.filter((w) => w.kind !== 'walk').map((w) => JSON.stringify(w.parts));
        expect(new Set(shapes).size, label(plan, week.n)).toBe(shapes.length);
      }
  });

  it('reaches a time aim as one run, and goes no further', () => {
    for (const minutes of [20, 45, 90]) {
      const plan = buildPath({ aim: { kind: 'time', minutes }, days: 3 });
      const last = plan.weeks[plan.weeks.length - 1];
      expect(last.stage).toBe('Your aim');
      const longest = Math.max(...last.workouts.flatMap((w) => flatten(w.parts).filter((s) => s.effort === 'easy').map((s) => s.minutes)));
      expect(longest).toBeGreaterThanOrEqual(minutes);
      // Nothing hard on the way to a time aim.
      for (const week of plan.weeks) for (const workout of week.workouts) expect(intenseMinutes(workout.parts)).toBe(0);
    }
  });

  it('ends a distance aim with its day, after a taper', () => {
    for (const meters of [5000, 10000, 21097.5, 42195]) {
      const plan = buildPath({ aim: { kind: 'distance', meters }, days: 4 });
      const minutes = plan.weeks.map(weekMinutes);
      const last = plan.weeks[plan.weeks.length - 1];
      expect(last.workouts.some((workout) => workout.kind === 'race')).toBe(true);
      expect(minutes[minutes.length - 1] / Math.max(...minutes)).toBeLessThanOrEqual(0.6);
      expect(plan.weeks.some((week) => week.stage === 'Taper')).toBe(true);
    }
  });

  it('keeps the long run within what the aim needs', () => {
    const marathon = buildPath({ aim: { kind: 'distance', meters: 42195 }, days: 5 });
    const longest = Math.max(...marathon.weeks.flatMap((week) => week.workouts.map((w) => totalMinutes(w.parts))));
    expect(longest).toBeGreaterThanOrEqual(140);
    expect(longest).toBeLessThanOrEqual(150);
    const fiveK = buildPath({ aim: { kind: 'distance', meters: 5000 }, days: 3 });
    expect(Math.max(...fiveK.weeks.flatMap((week) => week.workouts.map((w) => totalMinutes(w.parts))))).toBeLessThanOrEqual(60);
  });

  it('never stalls: a path reaches its aim within a sensible number of weeks', () => {
    for (const plan of paths) {
      // Long aims (beyond 16 km, or 75 minutes and more without stopping) grow the long run 10% at a time, so take longer.
      const long = (plan.aim.kind === 'distance' && plan.aim.meters > 16000) || (plan.aim.kind === 'time' && plan.aim.minutes >= 75);
      const most = long ? 50 : 40;
      const extra = plan.id.includes('-g') ? (long ? 10 : 5) : 0;
      expect(plan.weeks.length, plan.id).toBeLessThanOrEqual(plan.cycleFrom ? plan.cycleFrom + 4 : most + extra);
    }
  });

  it('takes longer when gentler', () => {
    const aim: Aim = { kind: 'distance', meters: 21097.5 };
    expect(buildPath({ aim, days: 4, gentler: true }).weeks.length).toBeGreaterThan(buildPath({ aim, days: 4 }).weeks.length);
  });

  it('goes round a steady rhythm without end', () => {
    const plan = buildPath({ aim: { kind: 'steady' }, days: 3 });
    expect(plan.cycleFrom).toBeDefined();
    const later = weekAt(plan, plan.weeks.length + 5);
    expect(later.stage).toBe('Keep going');
    expect(later.n).toBe(plan.weeks.length + 5);
  });

  it('counts back to a date: holding steady with time to spare, growing for fewer weeks without', () => {
    const aim: Aim = { kind: 'distance', meters: 10000 };
    const natural = buildPath({ aim, days: 3 });
    const join = 11;
    const today = '2026-10-05';
    const weeksOut = (weeks: number) => {
      const d = new Date(2026, 9, 5 + 7 * (weeks - 1));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const needed = natural.weeks.length - join + 1;
    const roomy = buildPath({ aim, days: 3, raceDate: weeksOut(needed + 4), joinWeek: join, today });
    expect(roomy.fit).toBe('held');
    expect(roomy.weeks.length - join + 1).toBe(needed + 4);
    const tight = buildPath({ aim, days: 3, raceDate: weeksOut(needed - 3), joinWeek: join, today });
    expect(tight.fit).toBe('shortened');
    expect(tight.weeks.length - join + 1).toBe(needed - 3);
  });

  it('joins where the runner is now', () => {
    const plan = buildPath({ aim: { kind: 'distance', meters: 21097.5 }, days: 4 });
    expect(joinWeekFor(plan, 0)).toBe(1);
    const join = joinWeekFor(plan, 180);
    expect(join).toBeGreaterThan(10);
    expect(weekMinutes(weekAt(plan, join))).toBeLessThanOrEqual(190);
  });

  it('says the aim plainly', () => {
    expect(aimWords({ kind: 'time', minutes: 45 })).toBe('Run 45 minutes without stopping');
    expect(aimWords({ kind: 'distance', meters: 10000 })).toBe('Run a 10K');
    expect(aimWords({ kind: 'distance', meters: 21097.5 })).toBe('Run a half marathon');
    expect(aimWords({ kind: 'distance', meters: 8000 })).toBe('Run 8 km');
    expect(aimWords({ kind: 'distance', meters: 8046.72 }, 'mi')).toBe('Run 5 miles');
    expect(aimWords({ kind: 'distance', meters: 12000 }, 'km')).toBe('Run 12 km');
  });
});

describe('heart-rate numbers', () => {
  it('estimates maximum heart rate with Tanaka', () => {
    expect(estimatedMax(40)).toBe(180);
  });

  it('gives easy running a range, using reserve when resting heart rate is known', () => {
    expect(heartRange('easy', { age: 40 })).toEqual([108, 130]);
    expect(heartRange('easy', { maxHr: 180, restingHr: 60 })).toEqual([132, 146]);
    expect(heartRange('easy', {})).toBeUndefined();
    expect(zoneRanges({ maxHr: 200 })[4]).toMatchObject({ low: 180, high: 200 });
  });
});

describe('where to begin', () => {
  it('suggests a level from the test, and the runner can choose another', () => {
    expect(suggestedLevel({ walk: 'under10', run: 'none' })).toBe('beginner');
    expect(suggestedLevel({ walk: 'over40', run: '15to30' })).toBe('beginner');
    expect(suggestedLevel({ walk: 'over40', run: '30to60', weekly: 120 })).toBe('intermediate');
    expect(suggestedLevel({ walk: 'over40', run: 'over60', weekly: 300 })).toBe('advanced');
    expect(placementFor({ walk: 'under10', run: 'none' }, 'beginner')).toMatchObject({ walkFirst: true, gentler: true, startIndex: 0 });
    expect(placementFor({ walk: 'over40', run: '5to15' }, 'beginner')).toMatchObject({ walkFirst: false, gentler: false, startIndex: 5 });
    expect(placementFor({ walk: 'over40', run: 'over60', weekly: 300 }, 'advanced').weekly).toBe(300);
  });

  it('starts every level at its own week 1', () => {
    const aim: Aim = { kind: 'distance', meters: 42195 };
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const placement = placementFor({ walk: 'over40', run: level === 'beginner' ? 'none' : 'over60', weekly: 300 }, level);
      const natural = buildPath({ aim, days: 4, walkFirst: placement.walkFirst, gentler: placement.gentler });
      const join = joinFor(natural, placement);
      const own = ownPath({ aim, days: 4, walkFirst: placement.walkFirst, gentler: placement.gentler, joinWeek: join, startedOn: '2026-10-05' });
      expect(own.weeks[0].n).toBe(1);
      expect(own.weeks[0].workouts).toEqual(natural.weeks[join - 1].workouts);
      if (level === 'beginner') expect(own.weeks[0].stage).toBe('Start');
      else expect(own.weeks[0].stage).not.toBe('Start');
    }
    const advanced = joinFor(buildPath({ aim, days: 4 }), placementFor({ walk: 'over40', run: 'over60', weekly: 300 }, 'advanced'));
    const intermediate = joinFor(buildPath({ aim, days: 4 }), placementFor({ walk: 'over40', run: '30to60', weekly: 120 }, 'intermediate'));
    expect(advanced).toBeGreaterThan(intermediate);
    // Even running five hours a week, a marathon build keeps room for the long runs to grow.
    const marathon = buildPath({ aim, days: 4 });
    expect(lastWeekOf(marathon) - advanced + 1).toBeGreaterThanOrEqual(12);
  });

  it('puts two walking weeks first when walking is short, and a gentler start takes the bigger steps twice', () => {
    const aim: Aim = { kind: 'distance', meters: 5000 };
    const plain = buildPath({ aim, days: 3 });
    const walking = buildPath({ aim, days: 3, walkFirst: true });
    expect(walking.weeks.length).toBe(plain.weeks.length + 2);
    expect(walking.weeks[0].workouts.every((w) => w.kind === 'walk')).toBe(true);
    const gentle = buildPath({ aim, days: 3, gentler: true });
    expect(gentle.weeks.filter((w) => w.stage === 'Start').length).toBe(15);
  });
});

describe('taking it more gradually', () => {
  it('keeps the runner on their week number and adds weeks', () => {
    const state = { aim: { kind: 'distance', meters: 10000 } as Aim, days: 3, joinWeek: 1, startedOn: '2026-10-05', week: 6 };
    const offer = moreGradual(state);
    expect(offer?.addedWeeks).toBeGreaterThan(0);
    const after = ownPath({ ...state, gentler: true, joinWeek: offer!.joinWeek });
    expect(weekAt(after, 6).startIndex).toBe(weekAt(ownPath(state), 6).startIndex);
    expect(moreGradual({ ...state, gentler: true })).toBeUndefined();
    expect(moreGradual({ ...state, raceDate: '2027-03-01' })).toBeUndefined();
  });

  it('counts older plans from the runner’s own week 1', () => {
    const migrated = fromOldPlan({ aim: { kind: 'distance', meters: 10000 }, days: 3, weekdays: [1, 3, 5], week: 14, joinWeek: 11, weekOf: '2026-10-05', moves: {}, startedOn: '2026-09-01' } as never);
    expect(migrated.week).toBe(4);
    expect(fromOldPlan(migrated).week).toBe(4);
  });
});
