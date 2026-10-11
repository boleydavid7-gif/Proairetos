import { describe, expect, it } from 'vitest';
import { foodFor, gramsOf, nutriScore, perServing, recipeNutrition } from '../../soma/core/nutrition';
import { readIngredient } from '../../soma/core/ingredients';

const per100 = (over: Partial<Record<'kcal' | 'protein' | 'fat' | 'saturated' | 'carbs' | 'sugars' | 'fibre' | 'sodium', number>>) => ({ kcal: 0, protein: 0, fat: 0, saturated: 0, carbs: 0, sugars: 0, fibre: 0, sodium: 0, ...over });

describe('Nutri-Score (2017, general foods)', () => {
  it('gives a vegetable dish an A', () => {
    // N = 0; P = fibre 3 + fruit and vegetables 5 + protein 1: -9.
    expect(nutriScore(per100({ kcal: 50, sugars: 2, saturated: 0.5, sodium: 40, fibre: 3, protein: 2 }), 90)).toEqual({ grade: 'A', points: -9 });
  });

  it('gives a sweet, fatty, salty bake an E, and leaves protein out above 11 negative points', () => {
    // Energy 2008 kJ: 5; sugars 30: 6; saturates 10: 9; sodium 300: 3. N = 23. Fibre 2: 2. Protein not counted: 21.
    expect(nutriScore(per100({ kcal: 480, sugars: 30, saturated: 10, sodium: 300, fibre: 2, protein: 9 }), 0)).toEqual({ grade: 'E', points: 21 });
  });

  it('places the grade boundaries as published', () => {
    // 418 kJ is one energy point and nothing offsets it: 1, a B. Two more points of sugar: 3, a C.
    expect(nutriScore(per100({ kcal: 100 }), 0)).toEqual({ grade: 'B', points: 1 });
    expect(nutriScore(per100({ kcal: 100, sugars: 10 }), 0)).toEqual({ grade: 'C', points: 3 });
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
    expect(result.read.map((each) => each.food)).toEqual(['lentils', 'onion', 'carrot', 'garlic', 'olive oil', 'stock']);
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
});
