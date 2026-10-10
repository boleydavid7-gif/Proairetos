import { describe, expect, it } from 'vitest';
import type { GroceryItem } from '../../soma/core/groceries';
import { addToList, byAisle } from '../../soma/core/groceries';
import { boughtLabel, bringHome, kitchenByAge, kitchenNames, usesFromKitchen } from '../../soma/core/kitchen';
import { easyGoing, threeFrom, tonight } from '../../soma/core/tonight';
import { dayShape, type Block } from '../../soma/core/dayShape';
import { gatherList, ovenHeats, scaleStep, stepsWithAmounts, timerName } from '../../soma/core/cookAids';
import { swapsFor } from '../../soma/core/swaps';
import { inSeason, seasonalRecipes } from '../../soma/core/seasons';
import { plannedAhead, plannedOn, togglePlanned, weekFrom } from '../../soma/core/week';
import { recipeAsText } from '../../soma/core/share';
import { fromText } from '../../soma/core/importRecipe';
import type { Recipe } from '../../soma/core/recipes';

const recipe = (over: Partial<Recipe>): Recipe => ({
  id: over.title ?? 'r',
  title: 'A dish',
  ingredients: [],
  steps: [],
  notes: '',
  tags: [],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...over,
});

const ids = (() => {
  let n = 0;
  return () => `id${(n += 1)}`;
})();

describe('the kitchen', () => {
  it('brings ticked things home and keeps them off the list', () => {
    const list = addToList([], [{ line: '2 lemons' }, { line: '1 bag spinach' }], {}, 'now', ids);
    const ticked = list.map((item) => (item.name === 'lemons' ? { ...item, checked: true } : item));
    const after = bringHome(ticked, '2026-10-03');
    expect(kitchenNames(after)).toEqual(['lemons']);
    expect(byAisle(after).flatMap((group) => group.items.map((item) => item.name))).toEqual(['bag spinach']);
    // Adding lemons again goes on the list, not onto the kitchen's lemons.
    const again = addToList(after, [{ line: '3 lemons' }], {}, 'now', ids);
    expect(again.filter((item) => item.name === 'lemons')).toHaveLength(2);
    // Bringing the same thing home again keeps one, with the newer day.
    const twice = bringHome(again.map((item) => (item.name === 'lemons' && item.place !== 'kitchen' ? { ...item, checked: true } : item)), '2026-10-05');
    expect(twice.filter((item) => item.place === 'kitchen').map((item) => [item.name, item.boughtAt])).toEqual([['lemons', '2026-10-05']]);
  });

  it('says how long things have been there as a fact', () => {
    expect(boughtLabel('2026-10-03', '2026-10-03')).toBe('Bought today');
    expect(boughtLabel('2026-10-02', '2026-10-03')).toBe('Bought yesterday');
    expect(boughtLabel('2026-09-29', '2026-10-03')).toMatch(/^Bought \w+day$/);
    expect(boughtLabel('2026-09-01', '2026-10-03')).toMatch(/^Bought Sep/);
  });

  it('lists the longest there first and finds them in recipes', () => {
    const items = [
      { name: 'rice', place: 'kitchen', boughtAt: '2026-10-02' },
      { name: 'spinach', place: 'kitchen', boughtAt: '2026-09-28' },
    ] as GroceryItem[];
    expect(kitchenByAge(items).map((item) => item.name)).toEqual(['spinach', 'rice']);
    expect(usesFromKitchen(['2 cups baby spinach', '1 onion'], ['spinach', 'rice'])).toEqual(['spinach']);
  });
});

describe('what can I make tonight', () => {
  const soup = recipe({ title: 'Soup', totalMinutes: 25, ingredients: ['1 onion', '2 cups spinach'], steps: ['Cook.'], cooked: ['2026-09-20'] });
  const roast = recipe({ title: 'Roast', totalMinutes: 120, ingredients: Array(12).fill('x'), steps: Array(9).fill('Step.') });
  const toast = recipe({ title: 'Toast', marks: ['comfort'], ingredients: ['bread'], steps: ['Toast it.'] });

  it('narrows by time, energy and leaning', () => {
    expect(tonight([soup, roast, toast], { time: 30 }, '2026-10-03').map((fit) => fit.recipe.title)).toEqual(expect.arrayContaining(['Soup']));
    expect(tonight([soup, roast, toast], { time: 30 }, '2026-10-03').map((fit) => fit.recipe.title)).not.toContain('Roast');
    expect(tonight([soup, roast, toast], { energy: 'low' }, '2026-10-03').map((fit) => fit.recipe.title)).not.toContain('Roast');
    expect(tonight([soup, roast, toast], { leaning: 'familiar' }, '2026-10-03').map((fit) => fit.recipe.title)).toEqual(['Soup']);
    expect(tonight([soup, roast, toast], { leaning: 'new' }, '2026-10-03').map((fit) => fit.recipe.title)).not.toContain('Soup');
    expect(easyGoing(toast)).toBe(true);
  });

  it('puts what is in the kitchen first, with plain facts', () => {
    const fits = tonight([roast, toast, soup], { kitchen: ['spinach'] }, '2026-10-03');
    expect(fits[0].recipe.title).toBe('Soup');
    expect(fits[0].facts).toEqual(['25 min', 'uses spinach', expect.stringMatching(/^last cooked Sep 20/)]);
    expect(fits.find((fit) => fit.recipe.title === 'Toast')!.facts).toContain('not cooked yet');
  });

  it('shows three at a time and comes round again', () => {
    expect(threeFrom([1, 2, 3, 4, 5], 0)).toEqual([1, 2, 3]);
    expect(threeFrom([1, 2, 3, 4, 5], 1)).toEqual([4, 5, 1]);
    expect(threeFrom([1, 2], 3)).toEqual([1, 2]);
  });
});

describe('the shape of the day', () => {
  const block = (date: string, from: number, to: number, name = 'Work'): Block => {
    const [y, m, d] = date.split('-').map(Number);
    return { kind: 'COMMITTED', name, date, start: new Date(y, m - 1, d, from), end: new Date(y, m - 1, d, to) };
  };

  it('notices a block through the evening and late ones ahead, in the schedule’s own words', () => {
    const shape = dayShape([block('2026-10-03', 15, 23, 'Class'), block('2026-10-05', 19, 31), block('2026-10-06', 19, 31)], '2026-10-03', new Date(2026, 9, 3, 9));
    expect(shape.busyEvening).toBe(true);
    expect(shape.today).toMatch(/^Class 3:00/);
    expect(shape.lateDays).toEqual(['2026-10-05', '2026-10-06']);
  });

  it('says nothing when the evening is open', () => {
    const shape = dayShape([block('2026-10-03', 7, 15)], '2026-10-03', new Date(2026, 9, 3, 16));
    expect(shape).toEqual({ today: undefined, busyEvening: false, lateDays: [] });
  });
});

describe('cooking aids', () => {
  const ingredients = ['1 large yellow onion, diced', '2 cups rice', '# Sauce', '3 cloves garlic', 'Salt'];
  it('puts amounts beside first mentions, scaled', () => {
    const steps = stepsWithAmounts(['Fry the onion until soft.', 'Add the rice and the onion juices.', 'Add garlic and 1 cup water.'], ingredients, 2);
    expect(steps[0]).toBe('Fry the onion (2 large) until soft.');
    expect(steps[1]).toBe('Add the rice (4 cups) and the onion juices.');
    expect(steps[2]).toBe('Add garlic (6 cloves) and 2 cup water.');
  });

  it('scales measured amounts and converts units without touching times', () => {
    expect(scaleStep('Add 2 cups stock and simmer 10 minutes at 350°F.', 1.5)).toBe('Add 3 cups stock and simmer 10 minutes at 350°F.');
    expect(scaleStep('Add 1/2 tsp salt.', 2)).toBe('Add 1 tsp salt.');
    expect(scaleStep('Add 2 cups stock and simmer 10 minutes at 350°F.', 1, 'metric')).toBe('Add 480 ml stock and simmer 10 minutes at 180°C.');
  });

  it('finds oven heats and names timers', () => {
    expect(ovenHeats(['Heat the oven to 400°F.', 'Bake at 200 °C', 'Roast at 425 degrees'])).toEqual(['400°F', '200°C', '425°']);
    expect(ovenHeats(['Heat the oven to 400°F.'], 'metric')).toEqual(['200°C']);
    expect(timerName('Rinse it. Simmer the rice for 18 minutes, covered.', '18 minutes')).toBe('Simmer the rice');
    expect(timerName('Fry the onion (1) for 5 minutes.', '5 minutes')).toBe('Fry the onion');
    expect(stepsWithAmounts(['Add 4 cups stock.'], ['4 cups vegetable stock'], 1)).toEqual(['Add 4 cups stock.']);
    expect(stepsWithAmounts(['Add the rice.'], ['1 cup rice'], 1, 'metric')).toEqual(['Add the rice (190 g).']);
    expect(gatherList(['# Base', '2 cups rice'], 2)).toEqual([{ heading: 'Base', line: '' }, { line: '4 cups rice' }]);
    expect(gatherList(['2 cups rice'], 1, 'metric')).toEqual([{ line: '380 g rice' }]);
  });
});

describe('swaps', () => {
  it('offers swaps for what the recipe has, each once', () => {
    const found = swapsFor(['1 cup buttermilk', '2 eggs', '1 tsp garlic powder', '2 cloves garlic', '1 cup milk']);
    expect(found.map((each) => each.swap.for)).toEqual(['Buttermilk', 'An egg (in baking)', 'Garlic', 'Milk']);
  });
});

describe('seasons', () => {
  it('turns round in the south', () => {
    expect(inSeason(9)).toContain('pumpkin');
    expect(inSeason(9, -33)).toContain('asparagus');
    const hits = seasonalRecipes([recipe({ title: 'Pie', ingredients: ['2 cups pumpkin puree'] })], inSeason(9));
    expect(hits[0].uses).toEqual(['pumpkin']);
  });
});

describe('a loose week', () => {
  it('places recipes on days and lets past days go', () => {
    const r = recipe({ title: 'Stew', planned: ['2026-09-30'] });
    const next = togglePlanned(r, '2026-10-04', '2026-10-03');
    expect(next.planned).toEqual(['2026-10-04']);
    expect(togglePlanned(next, '2026-10-04', '2026-10-03').planned).toEqual([]);
    expect(plannedOn([next], '2026-10-04')).toHaveLength(1);
    expect(plannedAhead([next, r], '2026-10-03').map((each) => each.title)).toEqual(['Stew']);
    expect(weekFrom('2026-10-03')).toHaveLength(7);
  });
});

describe('sharing', () => {
  it('writes a recipe that the paste import reads back', () => {
    const text = recipeAsText(recipe({ title: 'Lentil soup', servings: '4', ingredients: ['1 cup lentils', '1 onion'], steps: ['Rinse the lentils.', 'Simmer 20 minutes.'] }));
    const back = fromText(text);
    expect(back.title).toBe('Lentil soup');
    expect(back.ingredients).toEqual(['1 cup lentils', '1 onion']);
    expect(back.steps.length).toBe(2);
  });
});

describe('Proairetos reading SOMA', async () => {
  const { mealsOn, cookedForBetween, namesList } = await import('../../app/soma/meals');
  it('lists planned meals and meals cooked for someone', () => {
    const soup = recipe({ title: 'Soup', planned: ['2026-10-04'], cookedFor: { '2026-10-02': ['Mom', 'Sam'], '2026-09-01': ['Ali'] } });
    expect(mealsOn([soup], '2026-10-04')).toEqual([{ id: 'Soup', title: 'Soup' }]);
    expect(cookedForBetween([soup], '2026-09-28', '2026-10-05').map((meal) => [meal.day, namesList(meal.people)])).toEqual([['2026-10-02', 'Mom and Sam']]);
    expect(namesList(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
