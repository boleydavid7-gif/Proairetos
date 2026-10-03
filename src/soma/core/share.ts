import { headingText, isHeading, minutesLabel, timeOf, type Recipe } from './recipes';

/** A recipe as plain text, in the shape SOMA's paste import reads back (Ingredients, then Steps). */
export function recipeAsText(recipe: Recipe): string {
  const time = minutesLabel(timeOf(recipe));
  const lines = [
    recipe.title,
    [recipe.servings && `Serves ${recipe.servings}`, time].filter(Boolean).join(' · '),
    '',
    'Ingredients',
    ...recipe.ingredients.map((line) => (isHeading(line) ? `\n${headingText(line)}` : line)),
    '',
    'Steps',
    ...numbered(recipe.steps),
  ];
  if (recipe.url || recipe.source) lines.push('', `From ${[recipe.source, recipe.url].filter(Boolean).join(', ')}`);
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function numbered(steps: readonly string[]): string[] {
  let n = 0;
  return steps.map((step) => (isHeading(step) ? `\n${headingText(step)}` : `${(n += 1)}. ${step}`));
}
