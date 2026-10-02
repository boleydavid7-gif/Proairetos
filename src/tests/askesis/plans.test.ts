import { buildPlan, daysFor, goalsFor, weekMinutes, type Level, type Plan } from '../../askesis/core/plans';
import { flatten, intenseMinutes, minutesByEffort, totalMinutes } from '../../askesis/core/workouts';
import { estimatedMax, heartRange, zoneRanges } from '../../askesis/core/zones';

function everyPlan(): Plan[] {
  const plans: Plan[] = [];
  for (const level of ['beginner', 'intermediate', 'advanced'] as Level[])
    for (const days of daysFor(level))
      for (const goal of goalsFor(level)) plans.push(buildPlan({ level, days, goal }));
  return plans;
}

describe('training plans', () => {
  it('has a session for each chosen day, every week', () => {
    for (const plan of everyPlan())
      for (const week of plan.weeks) expect(week.workouts.length, `${plan.id} week ${week.n}`).toBe(plan.days);
  });

  it('gives every session a unique id', () => {
    for (const plan of everyPlan()) {
      const ids = plan.weeks.flatMap((week) => week.workouts.map((workout) => workout.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('keeps hard running to a fifth of the week or less (about 80/20)', () => {
    for (const plan of everyPlan())
      for (const week of plan.weeks) {
        const total = weekMinutes(week);
        const hard = week.workouts.reduce((sum, workout) => sum + intenseMinutes(workout.parts), 0);
        expect(hard / total, `${plan.id} week ${week.n}`).toBeLessThanOrEqual(0.2);
        const moderate = week.workouts.reduce((sum, workout) => sum + minutesByEffort(workout.parts).steady, 0);
        expect((hard + moderate) / total, `${plan.id} week ${week.n}`).toBeLessThanOrEqual(0.3);
      }
  });

  it('grows weekly time by under 10% over the busiest recent week', () => {
    for (const plan of everyPlan()) {
      if (plan.level === 'beginner') continue;
      const minutes = plan.weeks.slice(0, -1).map(weekMinutes);
      for (let i = 1; i < minutes.length; i += 1) {
        const before = Math.max(...minutes.slice(Math.max(0, i - 3), i));
        expect(minutes[i] / before, `${plan.id} week ${i + 1}`).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it('has an easier week regularly and tapers before a race', () => {
    for (const plan of everyPlan()) {
      if (plan.level === 'beginner') continue;
      const minutes = plan.weeks.map(weekMinutes);
      const peak = Math.max(...minutes);
      expect(plan.weeks.filter((week) => week.easier).length).toBeGreaterThanOrEqual(2);
      // Race week carries roughly half or less of the busiest week.
      expect(minutes[minutes.length - 1] / peak).toBeLessThanOrEqual(0.6);
      expect(plan.weeks[plan.weeks.length - 1].workouts.some((workout) => workout.kind === 'race')).toBe(true);
    }
  });

  it('keeps the long run within limits for its goal', () => {
    for (const plan of everyPlan()) {
      const cap = plan.goal === 'marathon' ? 180 : plan.goal === 'half' ? 120 : 80;
      for (const week of plan.weeks)
        for (const workout of week.workouts) expect(totalMinutes(workout.parts)).toBeLessThanOrEqual(cap + 0.01);
    }
  });

  it('takes a beginner from short walk-run intervals to 30 minutes of running', () => {
    const plan = buildPlan({ level: 'beginner', days: 3 });
    const first = flatten(plan.weeks[0].workouts[0].parts).filter((item) => item.effort === 'easy');
    expect(Math.max(...first.map((item) => item.minutes))).toBe(1);
    const last = plan.weeks[plan.weeks.length - 1].workouts.at(-1)!;
    expect(flatten(last.parts).find((item) => item.effort === 'easy')?.minutes).toBe(30);
    for (const week of plan.weeks)
      for (const workout of week.workouts) expect(totalMinutes(workout.parts)).toBeLessThanOrEqual(45);
  });

  it('builds an advanced marathon plan to a long run near three hours', () => {
    const plan = buildPlan({ level: 'advanced', days: 5, goal: 'marathon' });
    expect(plan.weeks).toHaveLength(18);
    const longest = Math.max(...plan.weeks.flatMap((week) => week.workouts.map((workout) => totalMinutes(workout.parts))));
    expect(longest).toBeGreaterThanOrEqual(150);
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
