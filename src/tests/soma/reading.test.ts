import { describe, expect, it } from 'vitest';
import { readIngredient, scaleLine } from '../../soma/core/ingredients';
import { addToList, boughtAs, byAisle } from '../../soma/core/groceries';
import { aisleFor } from '../../soma/core/aisles';
import { fromText, labelledMinutes } from '../../soma/core/importRecipe';
import { stepsWithAmounts } from '../../soma/core/cookAids';

const ids = (() => {
  let n = 0;
  return () => `g${(n += 1)}`;
})();
const names = (lines: string[]) => byAisle(addToList([], lines.map((line) => ({ line })), {}, 'now', ids)).flatMap((g) => g.items.map((i) => `${i.name}${i.amounts.length ? ` (${i.amounts.join(' + ')})` : ''}`));

describe('reading ingredient lines', () => {
  it('reads the thing to buy from awkward lines', () => {
    expect(readIngredient('1/2 cup plus 2 tbsp flour')).toMatchObject({ amount: 0.5, unit: 'cup', name: 'flour', note: 'plus 2 tbsp' });
    expect(readIngredient('1 can (15 oz) black beans, drained')).toMatchObject({ amount: 1, unit: 'can', name: 'black beans' });
    expect(readIngredient('1 (14 oz) can diced tomatoes')).toMatchObject({ unit: 'can', name: 'diced tomatoes', note: '(14 oz)' });
    expect(readIngredient('Juice of 1 lemon')).toMatchObject({ amount: 1, name: 'lemon', note: 'juice' });
    expect(readIngredient('2 medium sweet potatoes, peeled')).toMatchObject({ amount: 2, name: 'sweet potatoes' });
    expect(readIngredient('Fresh parsley for garnish').name).toBe('Fresh parsley');
    expect(readIngredient('1 loaf sourdough bread')).toMatchObject({ unit: 'loaf', name: 'sourdough bread' });
  });

  it('keeps units in step with amounts when scaling', () => {
    expect(scaleLine('1 cup milk', 2)).toBe('2 cups milk');
    expect(scaleLine('2 cups milk', 0.5)).toBe('1 cup milk');
    expect(scaleLine('1 can tomatoes', 3)).toBe('3 cans tomatoes');
    expect(scaleLine('2 eggs', 2)).toBe('4 eggs');
  });
});

describe('what goes on the grocery list', () => {
  it('buys lemons and limes for their juice', () => {
    expect(boughtAs('1 tbsp lemon juice')).toMatchObject({ name: 'lemon', amount: '1' });
    expect(boughtAs('1/4 cup fresh lime juice')).toMatchObject({ name: 'limes', amount: '2' });
    expect(names(['Juice of 2 lemons', '1 tbsp lemon juice'])).toEqual(['lemons (3)']);
  });

  it('adds ranges at both ends', () => {
    expect(names(['2 to 3 cups chicken broth', '1 cup chicken broth'])).toEqual(['chicken broth (3–4 cups)']);
  });

  it('files tofu with the chilled produce', () => {
    expect(aisleFor('firm tofu', {})).toBe('Produce');
  });
});

describe('pasted recipes', () => {
  const pasted = `Chicken Tikka Masala
Serves 4 | Prep 20 min | Cook 30 min

Ingredients
For the marinade:
1 cup plain yogurt
2 tsp ground cumin
For the sauce:
1 onion, chopped

Instructions
1. Combine yogurt and cumin.
2. Cook the onion for 5 minutes.

Notes
Leftovers keep 3 days.`;

  it('keeps parts as headings, notes as notes, and reads the times', () => {
    const draft = fromText(pasted);
    expect(draft.ingredients).toEqual(['# For the marinade', '1 cup plain yogurt', '2 tsp ground cumin', '# For the sauce', '1 onion, chopped']);
    expect(draft.steps).toEqual(['Combine yogurt and cumin.', 'Cook the onion for 5 minutes.']);
    expect(draft.notes).toBe('Leftovers keep 3 days.');
    expect([draft.servings, draft.prepMinutes, draft.cookMinutes, draft.totalMinutes]).toEqual(['4', 20, 30, 50]);
  });

  it('reads times in hours and minutes', () => {
    expect(labelledMinutes('Total time: 1 hr 10 mins', 'total')).toBe(70);
    expect(labelledMinutes('Cooking time 45 minutes', 'cook')).toBe(45);
  });
});

describe('amounts in cooking steps', () => {
  it('finds each ingredient by its last word too', () => {
    const steps = stepsWithAmounts(
      ['Combine yogurt, lemon juice and cumin. Add chicken and marinate 1 hour.'],
      ['1 cup plain yogurt', '1 tbsp lemon juice', '2 tsp ground cumin', '1.5 lbs chicken breast, cut into pieces'],
      1,
    );
    expect(steps[0]).toBe('Combine yogurt (1 cup), lemon juice (1 tbsp) and cumin (2 tsp). Add chicken (1.5 lbs) and marinate 1 hour.');
  });
});

describe('weighing dry things', async () => {
  const { convertLine } = await import('../../soma/core/ingredients');
  it('weighs cups of flour, sugar and butter in metric, and measures grams in US cups', () => {
    expect(convertLine('2 cups all-purpose flour', 'metric')).toBe('240 g all-purpose flour');
    expect(convertLine('1/2 cup packed brown sugar', 'metric')).toBe('105 g packed brown sugar');
    expect(convertLine('1 cup milk', 'metric')).toBe('240 ml milk');
    expect(convertLine('240 g flour', 'us')).toBe('2 cups flour');
    expect(convertLine('1 tbsp butter', 'metric')).toBe('14 g butter');
    expect(convertLine('1 cup peanut butter', 'metric')).toBe('270 g peanut butter');
  });
});

describe('what stays a volume', async () => {
  const { convertLine } = await import('../../soma/core/ingredients');
  it('keeps syrups and honey in spoons and millilitres', () => {
    expect(convertLine('1 tbsp maple syrup', 'metric')).toBe('15 ml maple syrup');
    expect(convertLine('2 tbsp honey', 'metric')).toBe('30 ml honey');
  });
});
