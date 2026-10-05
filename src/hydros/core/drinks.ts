export type DrinkKind = 'water' | 'coffee' | 'tea' | 'electrolyte' | 'sparkling' | 'other';

export type Drink = {
  id: string;
  kind: DrinkKind;
  amountOz: number;
  caffeineMg?: number;
  loggedAt: string;
  createdAt: string;
};

export type DrinkSource = {
  kind: DrinkKind;
  count: number;
  amountOz: number;
  caffeineMg: number;
};

export type HydrosActivity = 'low' | 'moderate' | 'high';
export type HydrosUnit = 'oz' | 'ml' | 'L';

export type HydrosSettings = {
  goalOz: number;
  usualMinOz: number;
  usualMaxOz: number;
  weightLb?: number;
  heightIn?: number;
  activity?: HydrosActivity;
  useRecommendedRange?: boolean;
  reminders?: boolean;
  reminderIntervalMinutes?: number;
  unit?: HydrosUnit;
};

export const defaultHydrosSettings = (): HydrosSettings => ({ goalOz: 80, usualMinOz: 60, usualMaxOz: 80, useRecommendedRange: false, reminders: false, reminderIntervalMinutes: 120, unit: 'oz' });

/** An average diet contributes about one-fifth of daily water needs through food. */
export const AVERAGE_FOOD_WATER_FRACTION = 0.2;

type RecommendationProfile = Pick<HydrosSettings, 'weightLb' | 'heightIn' | 'activity'>;

/**
 * Returns the estimated total daily water need before separating food and drinks.
 * The estimate is intentionally a starting point, not medical advice.
 */
export function recommendedTotalWaterOz(settings: RecommendationProfile): number | undefined {
  if (!Number.isFinite(settings.weightLb) || !Number.isFinite(settings.heightIn) || !settings.activity || settings.weightLb! <= 0 || settings.heightIn! <= 0) return undefined;
  const activityOz = settings.activity === 'high' ? 24 : settings.activity === 'moderate' ? 12 : 0;
  const heightAdjustment = Math.max(-6, Math.min(6, (settings.heightIn! - 66) * 0.25));
  return Math.round(Math.max(40, Math.min(180, settings.weightLb! * 0.5 + heightAdjustment + activityOz)));
}

export type WaterRecommendation = {
  totalNeedOz: number;
  foodWaterOz: number;
  drinkGoalOz: number;
};

/** Splits the estimate into average food water and the amount to drink. */
export function waterRecommendation(settings: RecommendationProfile): WaterRecommendation | undefined {
  const totalNeedOz = recommendedTotalWaterOz(settings);
  if (totalNeedOz === undefined) return undefined;
  const foodWaterOz = Math.round(totalNeedOz * AVERAGE_FOOD_WATER_FRACTION);
  return { totalNeedOz, foodWaterOz, drinkGoalOz: totalNeedOz - foodWaterOz };
}

/** The recommended daily amount to log as drinks, after average food water. */
export function recommendedGoalOz(settings: RecommendationProfile): number | undefined {
  return waterRecommendation(settings)?.drinkGoalOz;
}

/** The target shown to the person, optionally using the profile recommendation. */
export function effectiveGoalOz(settings: HydrosSettings): number {
  return settings.useRecommendedRange ? recommendedGoalOz(settings) ?? settings.goalOz : settings.goalOz;
}

const OUNCES_PER_ML = 1 / 29.5735;
const OUNCES_PER_LITER = 33.814;

export function unitLabel(unit: HydrosUnit = 'oz'): string {
  return unit;
}

export function ouncesToUnit(ounces: number, unit: HydrosUnit = 'oz'): number {
  if (unit === 'ml') return ounces / OUNCES_PER_ML;
  if (unit === 'L') return ounces / OUNCES_PER_LITER;
  return ounces;
}

export function unitToOunces(value: number, unit: HydrosUnit = 'oz'): number {
  if (unit === 'ml') return value * OUNCES_PER_ML;
  if (unit === 'L') return value * OUNCES_PER_LITER;
  return value;
}

/** Formats a stored ounce value in the person's chosen measurement unit. */
export function formatVolume(ounces: number, unit: HydrosUnit = 'oz'): string {
  const value = ouncesToUnit(ounces, unit);
  if (unit === 'L') return value.toFixed(1);
  return String(Math.round(value));
}

export function volumeLabel(ounces: number, unit: HydrosUnit = 'oz'): string {
  return `${formatVolume(ounces, unit)} ${unitLabel(unit)}`;
}

export const drinkKinds: { id: DrinkKind; label: string; caffeineMg: number }[] = [
  { id: 'water', label: 'Water', caffeineMg: 0 },
  { id: 'coffee', label: 'Coffee', caffeineMg: 95 },
  { id: 'tea', label: 'Tea', caffeineMg: 35 },
  { id: 'electrolyte', label: 'Sports drink', caffeineMg: 0 },
  { id: 'sparkling', label: 'Sparkling', caffeineMg: 0 },
  { id: 'other', label: 'Other', caffeineMg: 0 },
];

export const kindLabel = (kind: DrinkKind) => drinkKinds.find((item) => item.id === kind)?.label ?? 'Other';
export const kindCaffeine = (kind: DrinkKind) => drinkKinds.find((item) => item.id === kind)?.caffeineMg ?? 0;

export function localDate(when: Date = new Date()): string {
  const year = when.getFullYear();
  const month = String(when.getMonth() + 1).padStart(2, '0');
  const day = String(when.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Value for a datetime-local input without accidentally shifting it to UTC. */
export function localDateTimeInput(when: Date = new Date()): string {
  const offset = when.getTimezoneOffset();
  return new Date(when.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function dateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function sameDay(drink: Drink, date = new Date()): boolean {
  return localDate(new Date(drink.loggedAt)) === localDate(date);
}

export function totalOz(drinks: readonly Drink[]): number {
  return drinks.reduce((sum, drink) => sum + drink.amountOz, 0);
}

export function caffeine(drinks: readonly Drink[]): number {
  return drinks.reduce((sum, drink) => sum + (drink.caffeineMg ?? kindCaffeine(drink.kind)), 0);
}

/** Groups the day's entries so a total can always be traced back to drink types. */
export function sourceBreakdown(drinks: readonly Drink[]): DrinkSource[] {
  const grouped = new Map<DrinkKind, DrinkSource>();
  for (const drink of drinks) {
    const current = grouped.get(drink.kind) ?? { kind: drink.kind, count: 0, amountOz: 0, caffeineMg: 0 };
    current.count += 1;
    current.amountOz += drink.amountOz;
    current.caffeineMg += drink.caffeineMg ?? kindCaffeine(drink.kind);
    grouped.set(drink.kind, current);
  }
  return [...grouped.values()].sort((a, b) => b.amountOz - a.amountOz || a.kind.localeCompare(b.kind));
}

export function id(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
