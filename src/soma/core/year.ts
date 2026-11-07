import { countText, facts, inYear, type Year } from '../../core/year/year';
import type { Recipe } from './recipes';

/** Cooking in a year: times cooked, recipes cooked and added, who it was cooked for, and each recipe's times. */
export function somaYear(recipes: readonly Recipe[], year: number): Year {
  const cooked = recipes.map((recipe) => ({ recipe, days: (recipe.cooked ?? []).filter((day) => inYear(day, year)) })).filter((each) => each.days.length);
  const times = cooked.reduce((sum, each) => sum + each.days.length, 0);
  const added = recipes.filter((recipe) => inYear(recipe.createdAt, year)).length;
  const forWhom = new Map<string, number>();
  for (const recipe of recipes) {
    for (const [day, names] of Object.entries(recipe.cookedFor ?? {})) {
      if (!inYear(day, year)) continue;
      for (const name of names) forWhom.set(name, (forWhom.get(name) ?? 0) + 1);
    }
  }
  return {
    facts: facts(
      ['Times cooked', times > 0 && countText(times)],
      ['Recipes cooked', cooked.length > 0 && countText(cooked.length)],
      ['Recipes added', added > 0 && countText(added)],
      ['Cooked for', forWhom.size > 0 && (forWhom.size === 1 ? '1 person' : `${countText(forWhom.size)} people`)],
    ),
    lists: [
      { title: 'Each recipe', lines: cooked.sort((a, b) => b.days.length - a.days.length || a.recipe.title.localeCompare(b.recipe.title)).map((each) => `${each.recipe.title}: ${countText(each.days.length)}`) },
      { title: 'Cooked for', lines: [...forWhom].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => `${name}: ${countText(n)}`) },
    ].filter((list) => list.lines.length),
  };
}

export const somaDates = (recipes: readonly Recipe[]) => recipes.flatMap((recipe) => [recipe.createdAt, ...(recipe.cooked ?? [])]);
