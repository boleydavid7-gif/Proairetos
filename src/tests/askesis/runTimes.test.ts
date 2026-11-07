import { runTimes } from '../../app/askesis/runs';
import { defaultWeekdays } from '../../askesis/core/plans';
import type { PlanState } from '../../askesis/data/store';

vi.mock('../../app/services', () => ({ deviceDatabase: Promise.resolve(undefined) }));
vi.mock('../../app/sync/syncController', () => ({ onRemoteChanges: () => () => undefined }));

const plan: PlanState = {
  aim: { kind: 'distance', meters: 5000 },
  days: 3,
  weekdays: defaultWeekdays(3),
  week: 2,
  joinWeek: 1,
  weekOf: '2026-10-05',
  moves: {},
  startedOn: '2026-09-28',
  runAt: '06:30',
  place: 'River path',
};

describe('run reminders', () => {
  it('lists run days this week by name and next week as run days, at the chosen time', () => {
    const now = new Date(2026, 9, 6, 12, 0); // Tuesday
    const times = runTimes({ plan, workouts: [], unit: 'km' }, now, new Date(2026, 9, 20));
    expect(times.map((t) => t.at.getDay())).toEqual([2, 4, 6, 2, 4, 6]);
    expect(times[0].at.getHours()).toBe(6);
    expect(times[0].title).not.toBe('Run day');
    expect(times[3].title).toBe('Run day');
    expect(times[0].place).toBe('River path');
  });
  it('asks for nothing without a time', () => {
    expect(runTimes({ plan: { ...plan, runAt: undefined }, workouts: [], unit: 'km' }, new Date(2026, 9, 6), new Date(2026, 9, 20))).toEqual([]);
  });
});
