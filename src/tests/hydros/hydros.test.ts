import { rangeForTraining } from '../../hydros/data/training';
import { AVERAGE_FOOD_WATER_FRACTION, defaultHydrosSettings, effectiveGoalOz, formatVolume, greeting, recommendedGoalOz, recommendedTotalWaterOz, sourceBreakdown, totalOz, volumeLabel, waterRecommendation, type Drink } from '../../hydros/core/drinks';

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
    expect(greeting(new Date('2026-10-04T08:00:00.000Z'))).toBe('Good morning');
    expect(greeting(new Date('2026-10-04T19:00:00.000Z'))).toBe('Good evening');
    expect(sourceBreakdown(drinks)).toEqual([
      { kind: 'water', count: 1, amountOz: 12, caffeineMg: 0 },
      { kind: 'tea', count: 1, amountOz: 8, caffeineMg: 35 },
    ]);
  });
});
