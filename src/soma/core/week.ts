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

/** Every planned meal occurrence in a week, preserving repeated recipes. */
export function plannedWeek(recipes: readonly Recipe[], start: string, days = 7): Recipe[] {
  return weekFrom(start, days).flatMap((day) => plannedOn(recipes, day));
}

/** The recipe with a day added or taken away; days already past are let go. */
export function togglePlanned(recipe: Recipe, day: string, today: string): Recipe {
  const days = (recipe.planned ?? []).filter((each) => each >= today);
  const next = days.includes(day) ? days.filter((each) => each !== day) : [...days, day].sort();
  return { ...recipe, planned: next };
}

/** Moves one planned occurrence, leaving the recipe's other planned days intact. */
export function movePlanned(recipe: Recipe, from: string, to: string, today: string): Recipe {
  const days = (recipe.planned ?? []).filter((each) => each >= today);
  if (!days.includes(from) || from === to) return recipe;
  return { ...recipe, planned: [...new Set([...days.filter((each) => each !== from), to])].sort() };
}

/** Recipes planned from today on, each once, in the order of their first day. */
export function plannedAhead(recipes: readonly Recipe[], today: string, days = 7): Recipe[] {
  const last = addDays(today, days - 1);
  const first = (recipe: Recipe) => recipe.planned?.find((day) => day >= today && day <= last);
  return recipes.filter(first).sort((a, b) => first(a)!.localeCompare(first(b)!));
}

/** Each recipe placed in the seven days before `start`, placed again on the same weekday from `start` (undo restores). */
export function repeatWeekBefore(recipes: readonly Recipe[], start: string, today: string): Recipe[] {
  const before = weekFrom(addDays(start, -7));
  return recipes
    .map((recipe): Recipe | undefined => {
      const add = (recipe.planned ?? []).filter((day) => before.includes(day)).map((day) => addDays(day, 7)).filter((day) => day >= today);
      if (!add.length) return undefined;
      const days = [...new Set([...(recipe.planned ?? []).filter((each) => each >= today), ...add])].sort();
      return days.length === (recipe.planned ?? []).filter((each) => each >= today).length ? undefined : { ...recipe, planned: days };
    })
    .filter((recipe): recipe is Recipe => Boolean(recipe));
}
