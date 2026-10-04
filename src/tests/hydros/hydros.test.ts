import { rangeForTraining } from '../../hydros/data/training';
import { greeting, totalOz, type Drink } from '../../hydros/core/drinks';

describe('Hydros', () => {
  it('adds a modest run-day range to the person’s usual range', () => {
    expect(rangeForTraining({ usualMinOz: 60, usualMaxOz: 80 }, { runDay: false, loggedRun: false })).toEqual({ min: 60, max: 80, extra: 0 });
    expect(rangeForTraining({ usualMinOz: 60, usualMaxOz: 80 }, { runDay: true, loggedRun: true, minutes: 35 })).toEqual({ min: 68, max: 88, extra: 8 });
    expect(rangeForTraining({ usualMinOz: 60, usualMaxOz: 80 }, { runDay: true, loggedRun: true, minutes: 65 })).toEqual({ min: 76, max: 96, extra: 16 });
  });

  it('keeps simple intake and greeting calculations deterministic', () => {
    const drinks: Drink[] = [
      { id: 'a', kind: 'water', amountOz: 12, loggedAt: '2026-10-04T09:00:00.000Z', createdAt: '2026-10-04T09:00:00.000Z' },
      { id: 'b', kind: 'tea', amountOz: 8, loggedAt: '2026-10-04T12:00:00.000Z', createdAt: '2026-10-04T12:00:00.000Z' },
    ];
    expect(totalOz(drinks)).toBe(20);
    expect(greeting(new Date('2026-10-04T08:00:00.000Z'))).toBe('Good morning');
    expect(greeting(new Date('2026-10-04T19:00:00.000Z'))).toBe('Good evening');
  });
});
