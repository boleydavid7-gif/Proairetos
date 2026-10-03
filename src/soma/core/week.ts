import { addDays } from '../../core/scheduling/dates';
import type { Recipe } from './recipes';

/**
 * A loose week: recipes placed on days the person chose. No slots to fill;
 * an empty day stays empty, and a day that has passed simply drops away.
 */
export function weekFrom(today: string, days = 7): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, i));
}

export function plannedOn(recipes: readonly Recipe[], day: string): Recipe[] {
  return recipes.filter((recipe) => recipe.planned?.includes(day));
}

/** The recipe with a day added or taken away; days already past are let go. */
export function togglePlanned(recipe: Recipe, day: string, today: string): Recipe {
  const days = (recipe.planned ?? []).filter((each) => each >= today);
  const next = days.includes(day) ? days.filter((each) => each !== day) : [...days, day].sort();
  return { ...recipe, planned: next };
}

/** Recipes planned from today on, each once, in the order of their first day. */
export function plannedAhead(recipes: readonly Recipe[], today: string, days = 7): Recipe[] {
  const last = addDays(today, days - 1);
  const first = (recipe: Recipe) => recipe.planned?.find((day) => day >= today && day <= last);
  return recipes.filter(first).sort((a, b) => first(a)!.localeCompare(first(b)!));
}
