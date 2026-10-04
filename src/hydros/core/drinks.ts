export type DrinkKind = 'water' | 'coffee' | 'tea' | 'electrolyte' | 'sparkling' | 'other';

export type Drink = {
  id: string;
  kind: DrinkKind;
  amountOz: number;
  caffeineMg?: number;
  loggedAt: string;
  createdAt: string;
};

export type HydrosSettings = {
  goalOz: number;
  usualMinOz: number;
  usualMaxOz: number;
};

export const defaultHydrosSettings = (): HydrosSettings => ({ goalOz: 72, usualMinOz: 60, usualMaxOz: 80 });

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

export function id(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
