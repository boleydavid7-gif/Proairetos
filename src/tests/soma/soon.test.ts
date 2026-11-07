import { guessUseBy, keepsAbout, recipesUsing, shownUseBy, soonItems } from '../../soma/core/soon';
import { bringHome, kitchenByAge } from '../../soma/core/kitchen';
import { repeatWeekBefore } from '../../soma/core/week';
import type { GroceryItem } from '../../soma/core/groceries';
import type { Recipe } from '../../soma/core/recipes';

const item = (name: string, over: Partial<GroceryItem> = {}): GroceryItem => ({ id: name, name, amounts: [], aisle: 'Produce' as GroceryItem['aisle'], checked: false, from: [], addedAt: '', ...over });
const recipe = (id: string, over: Partial<Recipe> = {}) => ({ id, title: id, ingredients: [], steps: [], createdAt: '', updatedAt: '', ...over }) as unknown as Recipe;

describe('use soon', () => {
  it('guesses from the short end of FoodKeeper times, the specific before the general', () => {
    expect(keepsAbout('ground beef')).toBe(1);
    expect(keepsAbout('beef steak')).toBe(3);
    expect(keepsAbout('baby spinach')).toBe(3);
    expect(keepsAbout('rice')).toBeUndefined();
    expect(guessUseBy('Chicken thighs', '2026-10-15')).toBe('2026-10-16');
  });

  it('puts ticked things away with a first guess, and lists the soonest first', () => {
    const home = bringHome([item('milk', { checked: true }), item('rice', { checked: true })], '2026-10-15');
    expect(home.find((each) => each.name === 'milk')?.useBy).toBe('2026-10-22');
    expect(home.find((each) => each.name === 'rice')?.useBy).toBeUndefined();
    const kitchen = [item('a', { place: 'kitchen', useBy: '2026-10-20' }), item('b', { place: 'kitchen' }), item('c', { place: 'kitchen', useBy: '2026-10-16' })];
    expect(kitchenByAge(kitchen).map((each) => each.name)).toEqual(['c', 'a', 'b']);
    expect(soonItems(kitchen, '2026-10-15').map((each) => each.name)).toEqual(['c']);
  });

  it('says the day plainly and finds recipes that use what is soon', () => {
    expect(shownUseBy('2026-10-16', '2026-10-15')).toBe('Use by tomorrow');
    expect(shownUseBy('2026-10-14', '2026-10-15')).toMatch(/^Use-by was /);
    const found = recipesUsing([recipe('soup', { ingredients: ['2 cups spinach', '1 onion'] }), recipe('toast', { ingredients: ['bread'] })], [item('spinach', { place: 'kitchen' })]);
    expect(found.map((each) => each.recipe.id)).toEqual(['soup']);
  });
});

describe('weeks ahead', () => {
  it('places last week’s meals again on the same weekdays, once', () => {
    const recipes = [recipe('stew', { planned: ['2026-10-15', '2026-10-17'] }), recipe('tacos', { planned: ['2026-10-23'] })];
    const again = repeatWeekBefore(recipes, '2026-10-22', '2026-10-15');
    expect(again.map((each) => [each.id, each.planned])).toEqual([['stew', ['2026-10-15', '2026-10-17', '2026-10-22', '2026-10-24']]]);
    expect(repeatWeekBefore(again, '2026-10-22', '2026-10-15')).toEqual([]);
  });
});
