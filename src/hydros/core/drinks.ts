import { personalDate, type DaySettings } from '../../core/rhythm/personalDay';
import type { ScheduleOccurrence } from '../../core/scheduling/types';

export type DrinkKind = 'water' | 'coffee' | 'tea' | 'electrolyte' | 'sparkling' | 'other';

export type Drink = {
  id: string;
  kind: DrinkKind;
  profileId?: string;
  label?: string;
  amountOz: number;
  caffeineMg?: number;
  electrolytesMg?: number;
  sugarG?: number;
  loggedAt: string;
  createdAt: string;
};

export type HydrosDrinkProfile = {
  id: string;
  kind: DrinkKind;
  label: string;
  caffeineMg: number;
  electrolytesMg: number;
  sugarG: number;
  /** Fraction of the logged volume credited toward hydration (0–1). */
  hydrationCoefficient: number;
};

export type DrinkSource = {
  kind: DrinkKind;
  label?: string;
  count: number;
  amountOz: number;
  caffeineMg: number;
};

export type HydrosActivity = 'low' | 'moderate' | 'high';
export type HydrosUnit = 'oz' | 'ml' | 'L';

export type HydrosSettings = {
  goalOz: number;
  /** True once the person has set their own daily amount; until then Today shows what was drunk without a target. */
  goalChosen?: boolean;
  usualMinOz: number;
  usualMaxOz: number;
  weightLb?: number;
  heightIn?: number;
  activity?: HydrosActivity;
  useRecommendedRange?: boolean;
  reminders?: boolean;
  reminderIntervalMinutes?: number;
  /** When reminders may come: any waking hour (outside quiet hours), or only during work blocks. */
  reminderWhen?: 'waking' | 'work';
  /** On a run day from Askesis, add a little to the daily amount (shown, and can be turned off). */
  runDayExtra?: boolean;
  unit?: HydrosUnit;
  drinkProfiles?: HydrosDrinkProfile[];
  /** The person's usual glasses and bottles, one tap each. */
  glasses?: Glass[];
};

/** A glass or bottle the person uses often: one tap logs it. */
export type Glass = { id: string; label: string; amountOz: number; profileId: string };

/**
 * Hydration credit. Coffee, tea, sparkling water, sports drinks, soda and similar drinks hydrate about as
 * well as water at the amounts people drink them, so each counts in full unless the person changes it.
 */
export const HYDRATION_SOURCE =
  'Maughan et al., A randomized trial to assess the potential of different beverages to affect hydration status (Am J Clin Nutr, 2016); Killer et al., No evidence of dehydration with moderate daily coffee intake (PLoS One, 2014)';

export const defaultDrinkProfiles = (): HydrosDrinkProfile[] => [
  { id: 'water', kind: 'water', label: 'Water', caffeineMg: 0, electrolytesMg: 0, sugarG: 0, hydrationCoefficient: 1 },
  { id: 'coffee', kind: 'coffee', label: 'Coffee', caffeineMg: 95, electrolytesMg: 0, sugarG: 0, hydrationCoefficient: 1 },
  { id: 'tea', kind: 'tea', label: 'Tea', caffeineMg: 35, electrolytesMg: 0, sugarG: 0, hydrationCoefficient: 1 },
  { id: 'electrolyte', kind: 'electrolyte', label: 'Sports drink', caffeineMg: 0, electrolytesMg: 110, sugarG: 21, hydrationCoefficient: 1 },
  { id: 'sparkling', kind: 'sparkling', label: 'Sparkling', caffeineMg: 0, electrolytesMg: 0, sugarG: 0, hydrationCoefficient: 1 },
  { id: 'other', kind: 'other', label: 'Other', caffeineMg: 0, electrolytesMg: 0, sugarG: 0, hydrationCoefficient: 1 },
  { id: 'energy', kind: 'other', label: 'Energy drink', caffeineMg: 160, electrolytesMg: 0, sugarG: 27, hydrationCoefficient: 1 },
  { id: 'soda', kind: 'other', label: 'Soda', caffeineMg: 39, electrolytesMg: 0, sugarG: 39, hydrationCoefficient: 1 },
  { id: 'juice', kind: 'other', label: 'Juice', caffeineMg: 0, electrolytesMg: 0, sugarG: 24, hydrationCoefficient: 1 },
];

function validNonNegative(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) >= 0 ? Math.round(Number(value) * 10) / 10 : fallback;
}

/** Keeps editable drink profiles compatible with older Hydros settings. */
export function normalizeDrinkProfiles(value: unknown): HydrosDrinkProfile[] {
  const defaults = defaultDrinkProfiles();
  const saved = Array.isArray(value) ? value : [];
  const byId = new Map(saved.filter((item): item is Partial<HydrosDrinkProfile> => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')).map((item) => [String(item.id), item]));
  const normalize = (base: HydrosDrinkProfile, item?: Partial<HydrosDrinkProfile>): HydrosDrinkProfile => ({
    ...base,
    label: typeof item?.label === 'string' && item.label.trim() ? item.label.trim().slice(0, 40) : base.label,
    caffeineMg: validNonNegative(item?.caffeineMg, base.caffeineMg),
    electrolytesMg: validNonNegative(item?.electrolytesMg, base.electrolytesMg),
    sugarG: validNonNegative(item?.sugarG, base.sugarG),
    hydrationCoefficient: Number.isFinite(item?.hydrationCoefficient) ? Math.max(0, Math.min(1, Number(item?.hydrationCoefficient))) : base.hydrationCoefficient,
  });
  const profiles = defaults.map((base) => normalize(base, byId.get(base.id)));
  for (const item of saved) {
    if (!item || typeof item !== 'object') continue;
    const id = String((item as { id?: unknown }).id ?? '');
    if (!id || defaults.some((profile) => profile.id === id)) continue;
    const kind = (item as { kind?: unknown }).kind;
    if (kind !== 'water' && kind !== 'coffee' && kind !== 'tea' && kind !== 'electrolyte' && kind !== 'sparkling' && kind !== 'other') continue;
    const label = String((item as { label?: unknown }).label ?? '').trim();
    if (!label) continue;
    profiles.push(normalize({ id, kind, label, caffeineMg: 0, electrolytesMg: 0, sugarG: 0, hydrationCoefficient: 1 }, item as Partial<HydrosDrinkProfile>));
  }
  return profiles;
}

export const defaultHydrosSettings = (): HydrosSettings => ({ goalOz: 80, usualMinOz: 60, usualMaxOz: 80, useRecommendedRange: false, reminders: false, reminderIntervalMinutes: 120, reminderWhen: 'waking', runDayExtra: true, unit: 'oz', drinkProfiles: defaultDrinkProfiles() });

/** An average diet contributes about one-fifth of daily water needs through food. */
export const AVERAGE_FOOD_WATER_FRACTION = 0.2;

/** The defaults before drinks counted in full, so an untouched type can be brought up to date. */
export const OLD_DEFAULT_CREDIT: Record<string, number> = { coffee: 0.8, tea: 0.9, electrolyte: 0.9, other: 0.85, energy: 0.7, soda: 0.8, juice: 0.85 };

const LITER_OZ = 33.814;

export const REFERENCE_SOURCE = 'National Academies, Dietary Reference Intakes for Water (2004); EFSA, Dietary reference values for water (2010)';

/**
 * Published reference amounts for adults, as they are written: total water from all sources, and about
 * how much of it comes from drinks (the rest from food). Offered, never chosen for the person.
 */
export const referenceAmounts: readonly { id: string; label: string; totalOz: number; drinksOz: number }[] = [
  { id: 'women', label: 'Adult women', totalOz: Math.round(2.7 * LITER_OZ), drinksOz: Math.round(2.2 * LITER_OZ) },
  { id: 'men', label: 'Adult men', totalOz: Math.round(3.7 * LITER_OZ), drinksOz: Math.round(3.0 * LITER_OZ) },
];

/** The daily amount shown, as the person set it. */
export function effectiveGoalOz(settings: HydrosSettings): number {
  return settings.goalOz;
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

/** Returns the local Sunday that begins the week containing the date. */
export function startOfWeek(when: Date = new Date()): Date {
  const date = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

export function weekDates(when: Date = new Date()): string[] {
  const start = startOfWeek(when);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDate(date);
  });
}

/** Sunday-based week number, with the first Sunday of the year beginning week 1. */
export function weekNumber(when: Date = new Date()): number {
  const start = startOfWeek(when);
  const first = new Date(start.getFullYear(), 0, 1);
  first.setDate(first.getDate() + ((7 - first.getDay()) % 7));
  if (start < first) return weekNumber(new Date(start.getFullYear() - 1, 11, 31));
  // Count whole calendar days from the dates themselves; clock changes make a local day 23 or 25 hours long.
  const days = (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) - Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / 86_400_000;
  return Math.floor(days / 7) + 1;
}

export function monthDates(when: Date = new Date()): string[] {
  const first = new Date(when.getFullYear(), when.getMonth(), 1);
  const count = new Date(when.getFullYear(), when.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return localDate(date);
  });
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

/** Finds the saved profile for a drink, including older entries with only a label. */
export function profileForDrink(drink: Drink, profiles: readonly HydrosDrinkProfile[] = defaultDrinkProfiles()): HydrosDrinkProfile | undefined {
  return profiles.find((profile) => profile.id === drink.profileId)
    ?? profiles.find((profile) => profile.label.toLowerCase() === drink.label?.toLowerCase())
    ?? profiles.find((profile) => profile.kind === drink.kind);
}

/** Returns the editable fraction of a drink credited toward hydration. */
export function hydrationCoefficientFor(drink: Drink, profiles: readonly HydrosDrinkProfile[] = defaultDrinkProfiles()): number {
  return profileForDrink(drink, profiles)?.hydrationCoefficient ?? 1;
}

export function hydrationEquivalentOz(drink: Drink, profiles: readonly HydrosDrinkProfile[] = defaultDrinkProfiles()): number {
  return drink.amountOz * hydrationCoefficientFor(drink, profiles);
}

/** Net water equivalent used for the daily total and Flow charts. */
export function hydrationOz(drinks: readonly Drink[], profiles: readonly HydrosDrinkProfile[] = defaultDrinkProfiles()): number {
  return drinks.reduce((sum, drink) => sum + hydrationEquivalentOz(drink, profiles), 0);
}

export function caffeine(drinks: readonly Drink[]): number {
  return drinks.reduce((sum, drink) => sum + (drink.caffeineMg ?? kindCaffeine(drink.kind)), 0);
}

/** Groups the day's entries so a total can always be traced back to drink types. */
export function sourceBreakdown(drinks: readonly Drink[]): DrinkSource[] {
  const grouped = new Map<string, DrinkSource>();
  for (const drink of drinks) {
    const key = `${drink.kind}:${drink.profileId ?? drink.label ?? ''}`;
    const current = grouped.get(key) ?? { kind: drink.kind, count: 0, amountOz: 0, caffeineMg: 0 };
    if (drink.label && drink.label !== kindLabel(drink.kind)) current.label = drink.label;
    current.count += 1;
    current.amountOz += drink.amountOz;
    current.caffeineMg += drink.caffeineMg ?? kindCaffeine(drink.kind);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.amountOz - a.amountOz || a.kind.localeCompare(b.kind));
}

export function id(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Usual glasses to begin with, in round amounts of the person's unit. */
export function defaultGlasses(unit: HydrosUnit = 'oz'): Glass[] {
  const metric = unit !== 'oz';
  return [
    { id: 'glass', label: 'Glass', amountOz: metric ? unitToOunces(250, 'ml') : 8, profileId: 'water' },
    { id: 'bottle', label: 'Bottle', amountOz: metric ? unitToOunces(500, 'ml') : 16, profileId: 'water' },
  ];
}

export function normalizeGlasses(value: unknown, unit: HydrosUnit = 'oz'): Glass[] {
  if (!Array.isArray(value)) return defaultGlasses(unit);
  return value
    .filter((item): item is Partial<Glass> => Boolean(item && typeof item === 'object'))
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string' && item.label.trim() && Number.isFinite(item.amountOz) && Number(item.amountOz) > 0)
    .map((item) => ({ id: item.id!, label: item.label!.trim().slice(0, 30), amountOz: Number(item.amountOz), profileId: typeof item.profileId === 'string' ? item.profileId : 'water' }))
    .slice(0, 6);
}

/** A drink record for a glass or a repeat, at `when`, with its type's caffeine and the rest. */
export function drinkFrom(source: { profileId: string; amountOz: number }, profiles: readonly HydrosDrinkProfile[], when = new Date()): Drink {
  const profile = profiles.find((item) => item.id === source.profileId) ?? profiles[0] ?? defaultDrinkProfiles()[0];
  const at = when.toISOString();
  return {
    id: id(),
    kind: profile.kind,
    profileId: profile.id,
    label: profile.label,
    amountOz: source.amountOz,
    caffeineMg: profile.caffeineMg,
    electrolytesMg: profile.electrolytesMg,
    sugarG: profile.sugarG,
    loggedAt: at,
    createdAt: at,
  };
}

/**
 * The person's day a drink belongs to: the calendar date, unless their day has not turned over yet (a night
 * shift and the wind-down after it stay with the day they began), as Proairetos counts it.
 */
export function drinkDay(drink: Drink, blocks: readonly ScheduleOccurrence[] = [], settings: DaySettings = { startHour: 0, followShifts: true }): string {
  return personalDate(new Date(drink.loggedAt), blocks, settings);
}

export function drinksOnDay(drinks: readonly Drink[], day: string, blocks: readonly ScheduleOccurrence[] = [], settings?: DaySettings): Drink[] {
  return drinks.filter((drink) => drinkDay(drink, blocks, settings) === day);
}

/** Caffeine as recorded: the total, and when the last drink with any was logged. Facts only. */
export function caffeineFacts(drinks: readonly Drink[]): { mg: number; lastAt?: string } {
  const withCaffeine = drinks.filter((drink) => (drink.caffeineMg ?? kindCaffeine(drink.kind)) > 0);
  const lastAt = withCaffeine.map((drink) => drink.loggedAt).sort().pop();
  return { mg: Math.round(caffeine(drinks)), lastAt };
}
