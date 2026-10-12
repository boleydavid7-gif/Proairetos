import { describe, expect, it } from 'vitest';
import { foodFor, gramsOf, nutriScore, perServing, recipeNutrition } from '../../soma/core/nutrition';
import { readIngredient } from '../../soma/core/ingredients';

const per100 = (over: Partial<Record<'kcal' | 'protein' | 'fat' | 'saturated' | 'carbs' | 'sugars' | 'fibre' | 'sodium', number>>) => ({ kcal: 0, protein: 0, fat: 0, saturated: 0, carbs: 0, sugars: 0, fibre: 0, sodium: 0, ...over });

describe('Nutri-Score (2023, general foods)', () => {
  it('gives a vegetable dish an A', () => {
    // N = 0. P = fibre 4.5 (2) + fruit and vegetables 90% (5) + protein 2 g (0): -7.
    const result = nutriScore(per100({ kcal: 50, sugars: 2, saturated: 0.5, sodium: 40, fibre: 4.5, protein: 2 }), 90);
    expect(result.grade).toBe('A');
    expect(result.points).toBe(-7);
  });

  it('gives a sweet, fatty, salty bake an E, and leaves protein out at 11 or more points against', () => {
    // Energy 2008 kJ: 5; sugars 30 g: 8; saturates 10 g: 9; salt 0.75 g: 3. N = 25. Fibre 2 g: 0. Protein not counted.
    const result = nutriScore(per100({ kcal: 480, sugars: 30, saturated: 10, sodium: 300, fibre: 2, protein: 9 }), 0);
    expect(result).toMatchObject({ grade: 'E', points: 25, parts: { energy: 5, sugars: 8, saturated: 9, salt: 3, proteinCounted: false } });
  });

  it('places the grade boundaries as published', () => {
    expect(nutriScore(per100({}), 0).grade).toBe('A');
    // 418 kJ is one energy point and nothing offsets it: 1, a B. Sugar of 10 g adds two: 3, a C.
    expect(nutriScore(per100({ kcal: 100 }), 0)).toMatchObject({ grade: 'B', points: 1 });
    expect(nutriScore(per100({ kcal: 100, sugars: 10 }), 0)).toMatchObject({ grade: 'C', points: 3 });
  });

  it('counts at most 2 protein points for red meat', () => {
    const steak = per100({ kcal: 250, saturated: 6, sodium: 60, protein: 20 });
    expect(nutriScore(steak, 0).parts.protein).toBe(7);
    expect(nutriScore(steak, 0, true).parts.protein).toBe(2);
  });
});

describe('reading amounts as grams', () => {
  it('weighs cups by SR28 household measures, counts by usual weights, and cans by their size', () => {
    const flour = readIngredient('2 cups flour');
    expect(gramsOf(flour, foodFor(flour)!)).toBe(250);
    const onions = readIngredient('2 onions, chopped');
    expect(gramsOf(onions, foodFor(onions)!)).toBe(220);
    const beans = readIngredient('1 (15-ounce) can black beans, drained');
    expect(Math.round(gramsOf(beans, foodFor(beans)!)!)).toBe(255);
    const butter = readIngredient('1 stick butter');
    expect(gramsOf(butter, foodFor(butter)!)).toBe(113);
  });

  it('reads the juice of a lemon as lemon juice', () => {
    expect(foodFor(readIngredient('Juice of 1 lemon'))?.key).toBe('lemon juice');
  });
});

describe('a recipe', () => {
  const soup = ['1 cup lentils', '1 onion, diced', '2 carrots', '2 cloves garlic', '1 tbsp olive oil', '4 cups vegetable stock', '1 tsp cumin', 'Salt to taste'];

  it('reads what it can, leaves out the small things, and rates it', () => {
    const result = recipeNutrition(soup);
    expect(result.unread).toEqual([]);
    expect(result.read.map((each) => each.food)).toEqual(['lentils', 'onion', 'carrot', 'garlic', 'olive oil', 'vegetable broth']);
    expect(result.grade).toBeDefined();
    expect(['A', 'B']).toContain(result.grade);
  });

  it('gives per-serving facts, salt from sodium', () => {
    const facts = perServing(recipeNutrition(soup).total, 4);
    expect(facts.kcal).toBeGreaterThan(150);
    expect(facts.kcal).toBeLessThan(400);
    expect(facts.fibre).toBeGreaterThan(5);
  });

  it('gives no grade when too little could be read', () => {
    const result = recipeNutrition(['2 cups mystery grain', '1 cup something else', '1 onion']);
    expect(result.grade).toBeUndefined();
    expect(result.unread).toHaveLength(2);
  });

  it('rates a cake lower than the soup', () => {
    const cake = recipeNutrition(['2 cups flour', '1 1/2 cups sugar', '1 cup butter', '3 eggs', '1 cup milk']);
    expect(cake.grade).toMatch(/[DE]/);
  });

  it('gives no grade when a large line could not be read, even with most lines read', () => {
    // Four small lines read; the unknown grain is most of the dish.
    const result = recipeNutrition(['1 lb mystery grain', '1 onion', '1 carrot', '2 cloves garlic', '1 tbsp olive oil']);
    expect(result.unread).toEqual(['1 lb mystery grain']);
    expect(result.grade).toBeUndefined();
  });

  it('reads black pepper as a spice, not a bell pepper, and knows chocolate chips', () => {
    expect(recipeNutrition(['1 tsp black pepper', '2 cups flour', '1 cup sugar']).read.map((each) => each.food)).toEqual(['flour', 'sugar']);
    expect(foodFor(readIngredient('2 cups semi-sweet chocolate chips'))?.key).toBe('chocolate chips');
    expect(foodFor(readIngredient('1 red bell pepper'))?.key).toBe('bell pepper');
  });

  it('grades rich dishes as rich', () => {
    const alfredo = recipeNutrition(['1 lb fettuccine', '1/2 cup butter', '2 cups heavy cream', '2 cups grated parmesan', '3 cloves garlic, minced']);
    expect(alfredo.grade).toMatch(/[DE]/);
    const macAndCheese = recipeNutrition(['1 lb elbow macaroni', '4 tablespoons butter', '1/4 cup flour', '3 cups whole milk', '4 cups shredded sharp cheddar cheese', '1 teaspoon salt']);
    expect(macAndCheese.grade).toMatch(/[DE]/);
  });

  it('reads British measures: tblsp, knobs, rashers, both units, and lemon juice by the lemon', () => {
    const result = recipeNutrition(['175g/6oz plain flour', '2 tblsp olive oil', '1 knob butter', '4 rashers bacon', 'Juice of 1 lemon', '400g tinned tomatos']);
    expect(result.unread).toEqual([]);
    expect(result.read.find((each) => each.food === 'flour')?.grams).toBe(175);
    expect(result.read.find((each) => each.food === 'lemon juice')?.grams).toBe(45);
    expect(result.read.find((each) => each.food === 'bacon')?.grams).toBe(100);
  });

  it('follows the person: a chosen food, a weight for one line, a line left out', () => {
    const lines = ['2 cups rice', '1 jar house sauce', '1 lb chicken breast'];
    const unknown = recipeNutrition(lines);
    expect(unknown.grade).toBeUndefined();
    const named = recipeNutrition(lines, { foods: { 'house sauce': 'pasta sauce' }, grams: { '1 jar house sauce': 400 } });
    expect(named.unread).toEqual([]);
    expect(named.read.find((each) => each.food === 'pasta sauce')?.grams).toBe(400);
    expect(named.grade).toBeDefined();
    const without = recipeNutrition(lines, { leaveOut: ['house sauce'] });
    expect(without.unread).toEqual([]);
    expect(without.grade).toBeDefined();
  });
});
