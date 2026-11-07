import { countText, facts, inYear, type Year } from '../../core/year/year';
import { formatVolume, kindLabel, type Drink, type HydrosUnit } from './drinks';

/** What was drunk in a year, as logged: days, drinks, the amount in all, and each kind. */
export function hydrosYear(drinks: readonly Drink[], year: number, unit: HydrosUnit, dayOf: (drink: Drink) => string): Year {
  const kept = drinks.filter((drink) => inYear(dayOf(drink), year));
  if (!kept.length) return { facts: [], lists: [] };
  // Large totals read better in liters when the person counts in milliliters.
  const shownUnit: HydrosUnit = unit === 'ml' ? 'L' : unit;
  const amount = (ounces: number) => `${formatVolume(ounces, shownUnit)} ${shownUnit}`;
  const total = kept.reduce((sum, drink) => sum + drink.amountOz, 0);
  const byKind = new Map<string, { count: number; ounces: number }>();
  for (const drink of kept) {
    const name = kindLabel(drink.kind);
    const current = byKind.get(name) ?? { count: 0, ounces: 0 };
    byKind.set(name, { count: current.count + 1, ounces: current.ounces + drink.amountOz });
  }
  return {
    facts: facts(['Drinks logged', countText(kept.length)], ['Days', countText(new Set(kept.map(dayOf)).size)], ['In all', amount(total)]),
    lists: [{ title: 'Each kind', lines: [...byKind].sort((a, b) => b[1].ounces - a[1].ounces).map(([name, each]) => `${name}: ${countText(each.count)}, ${amount(each.ounces)}`) }],
  };
}
