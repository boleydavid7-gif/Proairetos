import { describe, expect, it } from 'vitest';
import { caffeineFacts, defaultDrinkProfiles, defaultGlasses, drinkDay, drinkFrom, normalizeGlasses, type Drink } from '../../hydros/core/drinks';
import { hydrationNotices, setHydrationSchedule } from '../../app/notify/hydrationSchedule';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { findJudgmentLanguage } from '../../core/rules/languageRules';

const at = (iso: string): Drink => ({ id: iso, kind: 'water', profileId: 'water', label: 'Water', amountOz: 8, loggedAt: new Date(iso).toISOString(), createdAt: '' });
const night: ScheduleOccurrence = {
  patternId: 'p', patternName: 'Work', kind: 'COMMITTED', date: '2026-10-10',
  start: new Date(2026, 9, 10, 19), end: new Date(2026, 9, 11, 7), changed: false,
};

describe('the day a drink belongs to', () => {
  it('is the calendar day with no schedule', () => {
    expect(drinkDay(at('2026-10-11T02:00:00'))).toBe('2026-10-11');
  });

  it('stays with the night shift it was drunk on, and the wind-down after', () => {
    expect(drinkDay(at('2026-10-11T02:00:00'), [night])).toBe('2026-10-10');
    expect(drinkDay(at('2026-10-11T09:30:00'), [night])).toBe('2026-10-10');
    expect(drinkDay(at('2026-10-11T10:30:00'), [night])).toBe('2026-10-11');
  });
});

describe('usual glasses and facts', () => {
  it('starts with a glass and a bottle in round amounts of the unit', () => {
    expect(defaultGlasses('oz').map((glass) => glass.amountOz)).toEqual([8, 16]);
    expect(defaultGlasses('ml').map((glass) => Math.round(glass.amountOz * 29.5735))).toEqual([250, 500]);
    expect(normalizeGlasses([{ id: 'x', label: ' Flask ', amountOz: 20, profileId: 'tea' }, { id: 'y', label: '', amountOz: 5 }])).toEqual([{ id: 'x', label: 'Flask', amountOz: 20, profileId: 'tea' }]);
  });

  it('logs a glass with its drink type', () => {
    const drink = drinkFrom({ profileId: 'coffee', amountOz: 12 }, defaultDrinkProfiles(), new Date(2026, 9, 10, 8));
    expect(drink).toMatchObject({ kind: 'coffee', label: 'Coffee', amountOz: 12, caffeineMg: 95 });
  });

  it('says how much caffeine and when the last was, nothing more', () => {
    const coffee = { ...at('2026-10-10T08:00:00'), kind: 'coffee' as const, caffeineMg: 95 };
    const tea = { ...at('2026-10-10T15:20:00'), kind: 'tea' as const, caffeineMg: 35 };
    expect(caffeineFacts([coffee, tea, at('2026-10-10T18:00:00')])).toEqual({ mg: 130, lastAt: tea.loggedAt });
    expect(caffeineFacts([at('2026-10-10T18:00:00')])).toEqual({ mg: 0, lastAt: undefined });
  });
});

describe('water reminders', () => {
  const quiet = { on: true, start: '22:00', end: '07:00', duringProtected: true };
  const time = (date: Date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

  it('come at steady times through the waking day, none in quiet hours', () => {
    setHydrationSchedule({ enabled: true, intervalMinutes: 120, when: 'waking' });
    const notices = hydrationNotices(new Date(2026, 9, 10, 6), quiet, { time });
    expect(notices.slice(0, 7).map((notice) => time(notice.at))).toEqual(['9:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']);
    expect(notices[7].at.getDate()).toBe(11);
    // Worked out again later the same day, the times do not move.
    expect(hydrationNotices(new Date(2026, 9, 10, 12, 7), quiet, { time })[0].at).toEqual(new Date(2026, 9, 10, 13));
    expect(notices[0]).toMatchObject({ title: 'Water', body: 'Nothing logged yet.', open: 'hydros' });
  });

  it('count from the last drink logged', () => {
    setHydrationSchedule({ enabled: true, intervalMinutes: 120, when: 'waking' });
    const notices = hydrationNotices(new Date(2026, 9, 10, 10), quiet, { lastDrinkAt: new Date(2026, 9, 10, 10, 30), time });
    expect(time(notices[0].at)).toBe('13:00');
    expect(notices[0].body).toBe('Last drink logged 10:30.');
  });

  it('can keep to work blocks, night shifts included', () => {
    setHydrationSchedule({ enabled: true, intervalMinutes: 180, when: 'work' });
    const notices = hydrationNotices(new Date(2026, 9, 10, 12), quiet, { work: [night], time });
    expect(notices.map((notice) => time(notice.at))).toEqual(['22:00', '1:00', '4:00']);
  });

  it('use no judging words', () => {
    setHydrationSchedule({ enabled: true, intervalMinutes: 120, when: 'waking' });
    for (const notice of hydrationNotices(new Date(2026, 9, 10, 6), quiet, { lastDrinkAt: new Date(2026, 9, 9, 20) }).slice(0, 5)) {
      expect(findJudgmentLanguage(`${notice.title} ${notice.body}`)).toEqual([]);
    }
  });
});

import { waterDuring } from '../../app/family/glance';

describe('water on Proairetos Today during work', () => {
  it('shows only while a work block is on, with what was logged since it began', () => {
    const drinks = [{ amountOz: 8, loggedAt: new Date(2026, 9, 10, 18).toISOString() }, { amountOz: 12, loggedAt: new Date(2026, 9, 10, 21, 5).toISOString() }, { amountOz: 8, loggedAt: new Date(2026, 9, 11, 1).toISOString() }];
    expect(waterDuring(drinks, [night], new Date(2026, 9, 10, 17), 'oz')).toBeUndefined();
    expect(waterDuring(drinks, [night], new Date(2026, 9, 11, 2), 'oz')?.line).toMatch(/^Water: 20 oz since work began · last /);
    expect(waterDuring([], [night], new Date(2026, 9, 10, 20), 'ml')?.line).toBe('Water: nothing logged since work began');
  });
});
