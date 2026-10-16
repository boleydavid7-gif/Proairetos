import { gzipSync, strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { alreadyKept, amountText, listLines, looseMinutes, readRecipeFiles } from '../../soma/core/fromApps';

const photo = btoa(String.fromCharCode(...Array.from({ length: 120 }, (_, i) => i)));

const paprika = {
  name: 'Lentil soup',
  ingredients: 'For the soup:\n1 cup red lentils\n1 onion, chopped\n\n2 tbsp olive oil',
  directions: 'Soften the onion in the oil.\n\nAdd the lentils and 4 cups water. Simmer 20 minutes.',
  notes: 'Freezes well.',
  description: '<p>A weeknight soup.</p>',
  servings: '4 servings',
  prep_time: '10 mins',
  cook_time: '1 hr 5 min',
  total_time: '',
  source: 'Grandma',
  source_url: 'https://example.com/soup',
  image_url: 'https://example.com/soup.jpg',
  photo_data: photo,
  categories: ['Soups', 'Weeknight'],
  on_favorites: 1,
  rating: 5,
};

describe('recipes from other apps', () => {
  it('reads a Paprika export: a zip of gzipped recipes', () => {
    const file = zipSync({
      'Lentil soup.paprikarecipe': gzipSync(strToU8(JSON.stringify(paprika))),
      'Toast.paprikarecipe': gzipSync(strToU8(JSON.stringify({ name: 'Toast', ingredients: '2 slices bread', directions: 'Toast it.' }))),
    });
    const { recipes, unread } = readRecipeFiles([{ name: 'My Recipes.paprikarecipes', bytes: file }]);
    expect(unread).toEqual([]);
    expect(recipes.map((each) => each.draft.title)).toEqual(['Lentil soup', 'Toast']);
    const soup = recipes[0];
    expect(soup.from).toBe('Paprika');
    expect(soup.photo?.length).toBe(120);
    expect(soup.draft).toMatchObject({
      source: 'Grandma',
      url: 'https://example.com/soup',
      image: 'https://example.com/soup.jpg',
      servings: '4 servings',
      prepMinutes: 10,
      cookMinutes: 65,
      ingredients: ['# For the soup', '1 cup red lentils', '1 onion, chopped', '2 tbsp olive oil'],
      steps: ['Soften the onion in the oil.', 'Add the lentils and 4 cups water. Simmer 20 minutes.'],
      notes: 'A weeknight soup.\n\nFreezes well.',
      tags: ['Soups', 'Weeknight'],
      favorite: true,
    });
  });

  it('reads one gzipped Paprika recipe', () => {
    const { recipes } = readRecipeFiles([{ name: 'Lentil soup.paprikarecipe', bytes: gzipSync(strToU8(JSON.stringify(paprika))) }]);
    expect(recipes).toHaveLength(1);
  });

  it('reads Mela, with its # headings', () => {
    const mela = {
      title: 'Pancakes',
      ingredients: '# Batter\n1 cup flour\n1 egg',
      instructions: 'Whisk.\nCook in a pan.',
      yield: '8',
      prepTime: '5 min',
      cookTime: '15 min',
      link: 'https://cooking.example.org/pancakes',
      images: [photo],
      categories: ['Breakfast'],
      favorite: true,
    };
    const { recipes } = readRecipeFiles([{ name: 'Pancakes.melarecipes', bytes: zipSync({ 'Pancakes.melarecipe': strToU8(JSON.stringify(mela)) }) }]);
    expect(recipes[0].from).toBe('Mela');
    expect(recipes[0].draft).toMatchObject({
      title: 'Pancakes',
      source: 'cooking.example.org',
      servings: '8',
      ingredients: ['# Batter', '1 cup flour', '1 egg'],
      steps: ['Whisk.', 'Cook in a pan.'],
      tags: ['Breakfast'],
      favorite: true,
    });
    expect(recipes[0].photo).toBeDefined();
  });

  it('reads Crouton, with amounts and units', () => {
    const crumb = {
      name: 'Rice',
      serves: 2,
      duration: 5,
      cookingDuration: 18,
      ingredients: [
        { order: 0, ingredient: { name: 'rice' }, quantity: { amount: 1.5, quantityType: 'CUP' } },
        { order: 1, ingredient: { name: 'salt' }, quantity: { amount: 0.5, quantityType: 'TEASPOON' } },
        { order: 2, ingredient: { name: 'bay leaf' }, quantity: { amount: 1, quantityType: 'ITEM' } },
      ],
      steps: [
        { order: 1, step: 'Simmer, covered.' },
        { order: 0, step: 'Rinse the rice.' },
      ],
      tags: [{ name: 'Sides' }],
    };
    const { recipes } = readRecipeFiles([{ name: 'Rice.crumb', bytes: strToU8(JSON.stringify(crumb)) }]);
    expect(recipes[0].draft).toMatchObject({
      title: 'Rice',
      servings: '2',
      prepMinutes: 5,
      cookMinutes: 18,
      totalMinutes: 23,
      ingredients: ['1½ cup rice', '½ tsp salt', '1 bay leaf'],
      steps: ['Rinse the rice.', 'Simmer, covered.'],
      tags: ['Sides'],
    });
  });

  it('reads schema.org recipes from JSON and saved pages', () => {
    const recipe = { '@type': 'Recipe', name: 'Salad', recipeIngredient: ['1 lettuce'], recipeInstructions: 'Wash and toss.' };
    const page = `<html><head><script type="application/ld+json">${JSON.stringify(recipe)}</script></head></html>`;
    const { recipes, unread } = readRecipeFiles([
      { name: 'export.json', bytes: strToU8(JSON.stringify([recipe, { ...recipe, name: 'Salad two' }])) },
      { name: 'salad.html', bytes: strToU8(page) },
      { name: 'notes.pdf', bytes: strToU8('%PDF-1.4') },
    ]);
    expect(recipes.map((each) => each.draft.title)).toEqual(['Salad', 'Salad two', 'Salad']);
    expect(unread).toEqual(['notes.pdf']);
  });

  it('reads a text file as one recipe', () => {
    const { recipes } = readRecipeFiles([{ name: 'soup.md', bytes: strToU8('# Soup\n## Ingredients\n1 onion\n## Method\nCook it.') }]);
    expect(recipes[0].draft).toMatchObject({ title: 'Soup', ingredients: ['1 onion'], steps: ['Cook it.'] });
  });

  it('leaves out the folders and hidden files a zip carries', () => {
    const file = zipSync({ '__MACOSX/._Toast.crumb': strToU8('x'), 'Toast.crumb': strToU8(JSON.stringify({ name: 'Toast', ingredients: [], steps: [{ step: 'Toast it.' }] })) });
    expect(readRecipeFiles([{ name: 'crouton.zip', bytes: file }]).recipes).toHaveLength(1);
  });

  it('reads times and amounts as written', () => {
    expect(looseMinutes('1 hr 10 mins')).toBe(70);
    expect(looseMinutes('45 minutes')).toBe(45);
    expect(looseMinutes('PT1H')).toBe(60);
    expect(looseMinutes('1:30')).toBe(90);
    expect(looseMinutes('')).toBeUndefined();
    expect(amountText(0.25)).toBe('¼');
    expect(amountText(2)).toBe('2');
    expect(amountText(1 / 3)).toBe('⅓');
    expect(listLines('- 1 egg\n#Sauce\n• salt')).toEqual(['1 egg', '# Sauce', 'salt']);
  });

  it('knows a recipe already on the shelf', () => {
    const shelf = [{ title: 'Lentil Soup', url: 'https://example.com/soup' }];
    expect(alreadyKept({ title: 'lentil soup', ingredients: [], steps: [] }, shelf)).toBe(true);
    expect(alreadyKept({ title: 'Lentil soup', url: 'https://other.example/soup', ingredients: [], steps: [] }, shelf)).toBe(false);
    expect(alreadyKept({ title: 'Toast', ingredients: [], steps: [] }, shelf)).toBe(false);
  });
});
