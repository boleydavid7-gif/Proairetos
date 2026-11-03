import { freeDaysThisWeek, layOut, nightNote, weekDates, type DayPlan } from '../../askesis/core/week';
import type { LogEntry } from '../../askesis/core/log';
import type { PlanWeek } from '../../askesis/core/plans';
import { step, type Workout } from '../../askesis/core/workouts';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

const workout: Workout = {
  id: 'easy-1',
  kind: 'easy',
  title: 'Easy run',
  summary: '30 minutes easy',
  parts: [step('easy', 30)],
  why: 'Build an easy base.',
  tips: [],
};

const week: PlanWeek = {
  n: 1,
  stage: 'Base',
  theme: 'Easy running',
  easier: false,
  workouts: [workout],
};

const night: ScheduleOccurrence = {
  patternId: 'night-shift',
  patternName: 'Night shift',
  kind: 'COMMITTED',
  date: '2026-11-02',
  start: new Date('2026-11-02T22:00:00'),
  end: new Date('2026-11-03T06:00:00'),
  changed: false,
};

const entry: LogEntry = {
  id: 'log-1',
  date: '2026-11-06',
  activity: 'run',
  workoutId: workout.id,
  workoutTitle: workout.title,
  seconds: 1800,
  createdAt: '2026-11-06T10:00:00',
};

describe('Askesis training calendar', () => {
  it('starts the calendar on Monday and returns seven local dates', () => {
    expect(weekDates('2026-11-03')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });

  it('shows the moved day and the actual completed day', () => {
    const moved = layOut(week, '2026-11-03', [1], { [workout.id]: '2026-11-05' }, []);
    expect(moved).toMatchObject([{ date: '2026-11-05', moved: true, workout }]);

    const completed = layOut(week, '2026-11-03', [1], { [workout.id]: '2026-11-05' }, [entry]);
    expect(completed).toMatchObject([{ date: '2026-11-06', moved: true, done: entry }]);
  });

  it('marks a day after an overnight shift and leaves it out of available days', () => {
    expect(nightNote('2026-11-03', [night])).toBe('Follows a night in your schedule');
    const plans: DayPlan[] = [
      { workout, date: '2026-11-05', moved: false },
    ];
    expect(freeDaysThisWeek(plans, '2026-11-03', [night])).toEqual([
      '2026-11-04',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });
});
