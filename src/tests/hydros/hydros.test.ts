import { rangeForTraining } from '../../hydros/data/training';
import { hydrosQuoteFor, hydrosQuotes } from '../../hydros/core/quotes';
import { AVERAGE_FOOD_WATER_FRACTION, defaultDrinkProfiles, defaultHydrosSettings, effectiveGoalOz, formatVolume, greeting, hydrationEquivalentOz, hydrationOz, localDate, monthDates, normalizeDrinkProfiles, recommendedGoalOz, recommendedTotalWaterOz, sourceBreakdown, startOfWeek, totalOz, volumeLabel, waterRecommendation, weekDates, weekNumber, type Drink } from '../../hydros/core/drinks';

describe('Hydros', () => {
  it('starts with an 80 ounce daily amount', () => {
    expect(defaultHydrosSettings()).toMatchObject({ goalOz: 80, unit: 'oz', reminders: false, reminderIntervalMinutes: 120 });
    expect(recommendedTotalWaterOz({ weightLb: 160, heightIn: 70, activity: 'moderate' })).toBe(93);
    expect(recommendedGoalOz({ weightLb: 160, heightIn: 70, activity: 'moderate' })).toBe(74);
  });

  it('separates average food water from the amount to drink', () => {
    const recommendation = waterRecommendation({ weightLb: 160, heightIn: 70, activity: 'moderate' });
    expect(recommendation).toEqual({ totalNeedOz: 93, foodWaterOz: 19, drinkGoalOz: 74 });
    expect(recommendation?.foodWaterOz).toBe(Math.round(recommendation!.totalNeedOz * AVERAGE_FOOD_WATER_FRACTION));
    expect(waterRecommendation({ weightLb: 160, heightIn: 70, activity: 'high' })).toMatchObject({ totalNeedOz: 105, drinkGoalOz: 84 });
  });

  it('does not recommend without a complete positive profile', () => {
    expect(waterRecommendation({ weightLb: 0, heightIn: 70, activity: 'moderate' })).toBeUndefined();
    expect(waterRecommendation({ weightLb: 160, heightIn: undefined, activity: 'moderate' })).toBeUndefined();
    expect(waterRecommendation({ weightLb: 160, heightIn: 70, activity: undefined })).toBeUndefined();
  });

  it('uses the selected target unless the profile recommendation is enabled', () => {
    const profile = { goalOz: 80, usualMinOz: 60, usualMaxOz: 80, weightLb: 160, heightIn: 70, activity: 'moderate' as const };
    expect(effectiveGoalOz(profile)).toBe(80);
    expect(effectiveGoalOz({ ...profile, useRecommendedRange: true })).toBe(74);
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
    expect(hydrationEquivalentOz(energy, profiles)).toBeCloseTo(11.9, 5);
    expect(hydrationOz([water, energy], profiles)).toBeCloseTo(19.9, 5);
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
