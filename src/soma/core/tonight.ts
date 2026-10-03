import { isHeading, minutesLabel, timeOf, type Recipe } from './recipes';
import { usesFromKitchen } from './kitchen';

/**
 * "What can I make tonight?": a few of the person's own recipes that fit
 * what they said (each question can be skipped). It narrows; it never
 * ranks one dish above another. The order is the kitchen first (what is
 * already there), then a mix that changes each day and with "Some others".
 */
export type TimeChoice = 15 | 30 | 60 | undefined;
export type EnergyChoice = 'low' | 'some' | 'full' | undefined;
export type Leaning = 'familiar' | 'new' | undefined;

export type Tonight = {
  time?: TimeChoice;
  energy?: EnergyChoice;
  /** What is in the kitchen; recipes using it come first. */
  kitchen?: readonly string[];
  leaning?: Leaning;
};

export type Fit = { recipe: Recipe; uses: string[]; facts: string[] };

/** A gentle recipe for a low day: marked Quick or Comfort, or short to read and make. */
export function easyGoing(recipe: Recipe): boolean {
  if (recipe.marks?.some((mark) => mark === 'quick' || mark === 'comfort')) return true;
  const steps = recipe.steps.filter((step) => !isHeading(step)).length;
  const ingredients = recipe.ingredients.filter((line) => !isHeading(line)).length;
  const time = timeOf(recipe);
  return steps <= 6 && ingredients <= 10 && (time === undefined || time <= 40);
}

export function fitsTime(recipe: Recipe, time: TimeChoice): boolean {
  if (!time) return true;
  const minutes = timeOf(recipe);
  if (minutes === undefined) return time >= 30 && Boolean(recipe.marks?.includes('quick'));
  return minutes <= time;
}

/** A steady number from text, so the mix holds through a day. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function tonight(recipes: readonly Recipe[], answers: Tonight, today: string): Fit[] {
  return recipes
    .filter((recipe) => fitsTime(recipe, answers.time))
    .filter((recipe) => answers.energy !== 'low' || easyGoing(recipe))
    .filter((recipe) => {
      const cooked = (recipe.cooked?.length ?? 0) > 0;
      return answers.leaning === 'familiar' ? cooked : answers.leaning === 'new' ? !cooked : true;
    })
    .map((recipe) => {
      const uses = answers.kitchen?.length ? usesFromKitchen(recipe.ingredients, answers.kitchen) : [];
      const last = recipe.cooked?.at(-1);
      const facts = [
        minutesLabel(timeOf(recipe)),
        uses.length ? `uses ${uses.slice(0, 3).join(', ')}` : undefined,
        last ? `last cooked ${shortDay(last)}` : 'not cooked yet',
      ].filter((fact): fact is string => Boolean(fact));
      return { recipe, uses, facts };
    })
    .sort((a, b) => b.uses.length - a.uses.length || hash(today + a.recipe.id) - hash(today + b.recipe.id));
}

/** Three at a time; "Some others" moves along, coming round again at the end. */
export function threeFrom<T>(all: readonly T[], round: number): T[] {
  if (all.length <= 3) return [...all];
  const start = (round * 3) % all.length;
  return [...all, ...all].slice(start, start + 3);
}

export function shortDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
