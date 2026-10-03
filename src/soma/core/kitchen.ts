import { itemKey, readIngredient } from './ingredients';
import { inKitchen, onList, type GroceryItem } from './groceries';

/**
 * What is in the kitchen: things ticked as bought come home here (or are
 * added by hand), and leave when the person says they are used up. Only
 * plain facts about them ("bought Tuesday"), never a warning.
 */

/** Ticked items move from the list into the kitchen; the same thing already there takes the newer day. */
export function bringHome(all: readonly GroceryItem[], today: string): GroceryItem[] {
  const home = all.filter((item) => onList(item) && item.checked);
  const keys = new Set(home.map((item) => itemKey(item.name)));
  return [
    ...all.filter((item) => !(onList(item) && item.checked) && !(inKitchen(item) && keys.has(itemKey(item.name)))),
    ...home.map((item) => ({ ...item, place: 'kitchen' as const, boughtAt: today, checked: false })),
  ];
}

export function kitchenNames(all: readonly GroceryItem[]): string[] {
  return all.filter(inKitchen).map((item) => item.name);
}

/** Whether a recipe line uses something in the kitchen. */
export function usesFromKitchen(lines: readonly string[], kitchen: readonly string[]): string[] {
  const keys = kitchen.map((name) => ({ name, key: itemKey(name) })).filter(({ key }) => key.length > 1);
  const found = new Set<string>();
  for (const line of lines) {
    const name = itemKey(readIngredient(line).name);
    for (const { name: have, key } of keys) if (name.includes(key) || key.includes(name)) found.add(have);
  }
  return [...found];
}

/** "Bought today", "Bought Tuesday", "Bought Sep 28": how long it has been there, as a fact. */
export function boughtLabel(day: string | undefined, today: string): string | undefined {
  if (!day) return undefined;
  if (day === today) return 'Bought today';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const [ty, tm, td] = today.split('-').map(Number);
  const days = Math.round((new Date(ty, tm - 1, td).getTime() - date.getTime()) / 86_400_000);
  if (days === 1) return 'Bought yesterday';
  if (days > 1 && days < 7) return `Bought ${date.toLocaleDateString(undefined, { weekday: 'long' })}`;
  return `Bought ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/** Kitchen things, the ones there longest first, so they come to mind. */
export function kitchenByAge(all: readonly GroceryItem[]): GroceryItem[] {
  return all.filter(inKitchen).sort((a, b) => (a.boughtAt ?? '').localeCompare(b.boughtAt ?? '') || a.name.localeCompare(b.name));
}
