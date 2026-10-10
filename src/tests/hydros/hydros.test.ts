import { rangeForTraining } from '../../hydros/data/training';
import { hydrosQuoteFor, hydrosQuotes } from '../../hydros/core/quotes';
import { referenceAmounts, defaultDrinkProfiles, defaultHydrosSettings, effectiveGoalOz, formatVolume, greeting, hydrationEquivalentOz, hydrationOz, localDate, monthDates, normalizeDrinkProfiles, sourceBreakdown, startOfWeek, totalOz, volumeLabel, weekDates, weekNumber, type Drink } from '../../hydros/core/drinks';

describe('Hydros', () => {
  it('starts with an 80 ounce daily amount', () => {
    expect(defaultHydrosSettings()).toMatchObject({ goalOz: 80, unit: 'oz', reminders: false, reminderIntervalMinutes: 120 });
  });

  it('offers published reference amounts, drinks being about four fifths of the whole', () => {
    expect(referenceAmounts.map((reference) => [reference.label, reference.drinksOz, reference.totalOz])).toEqual([
      ['Adult women', 74, 91],
      ['Adult men', 101, 125],
    ]);
  });

  it('uses the amount the person set', () => {
    expect(effectiveGoalOz({ goalOz: 64, usualMinOz: 60, usualMaxOz: 80, useRecommendedRange: true })).toBe(64);
  });

  it('converts stored ounces into the selected display unit', () => {
    expect(formatVolume(80, 'oz')).toBe('80');
    expect(volumeLabel(80, 'ml')).toBe('2366 ml');
    expect(volumeLabel(33.814, 'L')).toBe('1.0 L');
  });

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
    expect(greeting(new Date(2026, 9, 4, 8, 0))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 4, 14, 0))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 4, 19, 0))).toBe('Good evening');
    expect(sourceBreakdown(drinks)).toEqual([
      { kind: 'water', count: 1, amountOz: 12, caffeineMg: 0 },
      { kind: 'tea', count: 1, amountOz: 8, caffeineMg: 35 },
    ]);
  });

  it('builds Sunday through Saturday weeks and yearly week labels', () => {
    const date = new Date(2026, 9, 7);
    expect(localDate(startOfWeek(date))).toBe('2026-10-04');
    expect(weekDates(date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
    expect(weekNumber(date)).toBe(40);
  });

  it('builds every day from the first through the last day of a month', () => {
    const dates = monthDates(new Date(2026, 1, 10));
    expect(dates).toHaveLength(28);
    expect(dates[0]).toBe('2026-02-01');
    expect(dates.at(-1)).toBe('2026-02-28');
  });

  it('keeps the Hydros Stoic line stable through a day', () => {
    expect(hydrosQuoteFor('2026-10-05')).toBe(hydrosQuoteFor('2026-10-05'));
    expect(hydrosQuotes).toContain(hydrosQuoteFor('2026-10-05'));
  });

  it('ships editable drink profiles and preserves their values', () => {
    expect(defaultDrinkProfiles().map((profile) => profile.id)).toEqual(['water', 'coffee', 'tea', 'electrolyte', 'sparkling', 'other', 'energy', 'soda', 'juice']);
    const profiles = normalizeDrinkProfiles([{ id: 'coffee', kind: 'coffee', label: 'Morning coffee', caffeineMg: 120, electrolytesMg: 4, sugarG: 2 }]);
    expect(profiles.find((profile) => profile.id === 'coffee')).toMatchObject({ label: 'Morning coffee', caffeineMg: 120, electrolytesMg: 4, sugarG: 2 });
    expect(profiles.find((profile) => profile.id === 'energy')?.caffeineMg).toBe(160);
  });

  it('credits beverage volume by its hydration coefficient', () => {
    const profiles = defaultDrinkProfiles();
    const energy: Drink = { id: 'energy-17', kind: 'other', profileId: 'energy', label: 'Energy drink', amountOz: 17, loggedAt: '2026-10-04T09:00:00.000Z', createdAt: '2026-10-04T09:00:00.000Z' };
    const water: Drink = { id: 'water-8', kind: 'water', profileId: 'water', amountOz: 8, loggedAt: '2026-10-04T09:00:00.000Z', createdAt: '2026-10-04T09:00:00.000Z' };
    // Every drink counts in full unless the person changes it (Maughan 2016; Killer 2014).
    expect(hydrationEquivalentOz(energy, profiles)).toBe(17);
    expect(hydrationOz([water, energy], profiles)).toBe(25);
    const lighter = profiles.map((profile) => (profile.id === 'energy' ? { ...profile, hydrationCoefficient: 0.7 } : profile));
    expect(hydrationEquivalentOz(energy, lighter)).toBeCloseTo(11.9, 5);
    expect(hydrationEquivalentOz(water, profiles)).toBe(8);
  });

  it('keeps custom drink labels separate in source breakdowns', () => {
    const drinks: Drink[] = [
      { id: 'a', kind: 'other', profileId: 'energy', label: 'Energy drink', amountOz: 12, caffeineMg: 160, loggedAt: '2026-10-04T09:00:00.000Z', createdAt: '2026-10-04T09:00:00.000Z' },
      { id: 'b', kind: 'other', profileId: 'soda', label: 'Soda', amountOz: 12, caffeineMg: 39, loggedAt: '2026-10-04T10:00:00.000Z', createdAt: '2026-10-04T10:00:00.000Z' },
    ];
    expect(sourceBreakdown(drinks)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'other', label: 'Energy drink', amountOz: 12, caffeineMg: 160 }),
      expect.objectContaining({ kind: 'other', label: 'Soda', amountOz: 12, caffeineMg: 39 }),
    ]));
  });
});
