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

export type HydrosSettings = {
  goalOz: number;
  usualMinOz: number;
  usualMaxOz: number;
  weightLb?: number;
  heightIn?: number;
  activity?: HydrosActivity;
};

export const defaultHydrosSettings = (): HydrosSettings => ({ goalOz: 80, usualMinOz: 60, usualMaxOz: 80 });

/** A transparent starting point for a personal amount recommendation. */
export function recommendedGoalOz(settings: Pick<HydrosSettings, 'weightLb' | 'heightIn' | 'activity'>): number | undefined {
  if (!Number.isFinite(settings.weightLb) || !Number.isFinite(settings.heightIn) || !settings.activity || settings.weightLb! <= 0 || settings.heightIn! <= 0) return undefined;
  const activityOz = settings.activity === 'high' ? 24 : settings.activity === 'moderate' ? 12 : 0;
  const heightAdjustment = Math.max(-6, Math.min(6, (settings.heightIn! - 66) * 0.25));
  return Math.round(Math.max(40, Math.min(180, settings.weightLb! * 0.5 + heightAdjustment + activityOz)));
}

export const drinkKinds: { id: DrinkKind; label: string; caffeineMg: number }[] = [
  { id: 'water', label: 'Water', caffeineMg: 0 },
  { id: 'coffee', label: 'Coffee', caffeineMg: 95 },
  { id: 'tea', label: 'Tea', caffeineMg: 35 },
  { id: 'electrolyte', label: 'Electrolyte', caffeineMg: 0 },
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
