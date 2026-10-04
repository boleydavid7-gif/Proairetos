import { aisleFor } from '../../soma/core/aisles';
import { addToList, byAisle, listAsText } from '../../soma/core/groceries';
import { convertAmountText, convertLine, convertText, formatAmount, readIngredient, scaleLine } from '../../soma/core/ingredients';
import { fromJsonLd, fromMeal, fromText, isoMinutes } from '../../soma/core/importRecipe';
import { searchRecipes, withWhatIHave, type Recipe } from '../../soma/core/recipes';
import { waysToTry } from '../../soma/core/tryIt';
import { lineFor } from '../../soma/core/lines';

describe('reading ingredients', () => {
  it('finds the amount, unit, thing and note', () => {
    expect(readIngredient('1 1/2 cups rolled oats, toasted')).toMatchObject({ amount: 1.5, unit: 'cups', name: 'rolled oats', note: ', toasted' });
    expect(readIngredient('2-3 cloves garlic, minced')).toMatchObject({ amount: 2, amountTo: 3, unit: 'cloves', name: 'garlic' });
    expect(readIngredient('½ tsp salt')).toMatchObject({ amount: 0.5, unit: 'tsp', name: 'salt' });
    expect(readIngredient('200g spaghetti')).toMatchObject({ amount: 200, unit: 'g', name: 'spaghetti' });
    expect(readIngredient('Salt and pepper to taste')).toMatchObject({ name: 'Salt and pepper to taste' });
    expect(readIngredient('2 large eggs')).toMatchObject({ amount: 2, name: 'large eggs' });
  });

  it('scales amounts and writes them kindly', () => {
    expect(scaleLine('2 cups flour', 1.5)).toBe('3 cups flour');
    expect(scaleLine('1 1/2 cups rice', 2)).toBe('3 cups rice');
    expect(scaleLine('1 tsp salt', 0.5)).toBe('½ tsp salt');
    expect(scaleLine('2-3 cloves garlic', 2)).toBe('4–6 cloves garlic');
    expect(scaleLine('A pinch of salt', 2)).toBe('A pinch of salt');
    expect(formatAmount(1 / 3)).toBe('⅓');
    expect(formatAmount(2.75)).toBe('2¾');
  });

  it('converts measured amounts without changing the saved wording', () => {
    expect(convertLine('1 1/2 cups rolled oats, toasted', 'metric')).toBe('360 ml rolled oats, toasted');
    expect(convertLine('500 g flour', 'us')).toBe('1.1 lb flour');
    expect(convertLine('2-3 tbsp olive oil', 'metric')).toBe('30–45 ml olive oil');
    expect(convertLine('3 cloves garlic', 'metric')).toBe('3 cloves garlic');
    expect(convertAmountText('2 cups', 'rice', 'metric')).toBe('480 ml');
    expect(convertText('Add 1 cup stock and 2 oz butter. Simmer 10 minutes at 350°F.', 'metric')).toBe('Add 240 ml stock and 57 g butter. Simmer 10 minutes at 177°C.');
    expect(convertText('Bake at 180°C.', 'us')).toBe('Bake at 356°F.');
    expect(convertText('Bake at 350F.', 'metric')).toBe('Bake at 177°C.');
  });
});

describe('aisles', () => {
  it('puts things where shops usually keep them', () => {
    expect(aisleFor('chicken stock')).toBe('Pantry');
    expect(aisleFor('chicken breast')).toBe('Meat & fish');
    expect(aisleFor('bell pepper')).toBe('Produce');
    expect(aisleFor('black pepper')).toBe('Spices');
    expect(aisleFor('garlic')).toBe('Produce');
    expect(aisleFor('garlic powder')).toBe('Spices');
    expect(aisleFor('frozen peas')).toBe('Frozen');
    expect(aisleFor('greek yogurt')).toBe('Dairy & eggs');
    expect(aisleFor('rolled oats')).toBe('Pantry');
    expect(aisleFor('salt and pepper')).toBe('Spices');
    expect(aisleFor('something unusual')).toBe('Other');
    expect(aisleFor('tofu', { tofu: 'Produce' })).toBe('Produce');
  });
});

describe('groceries', () => {
  let n = 0;
  const id = () => `g${(n += 1)}`;
  it('joins the same thing from two recipes and adds amounts in the same unit', () => {
    const a = { id: 'r1', title: 'Soup' };
    const b = { id: 'r2', title: 'Curry' };
    let list = addToList([], [{ line: '2 onions', recipe: a }, { line: '1 cup rice', recipe: a }], {}, '2026-10-06', id);
    list = addToList(list, [{ line: '1 onion, sliced', recipe: b }, { line: '2 cups rice', recipe: b }, { line: '200 g rice', recipe: b }], {}, '2026-10-06', id);
    const onions = list.find((item) => item.name.startsWith('onion'))!;
    expect(onions.amounts).toEqual(['3']);
    expect(onions.from.map((each) => each.title)).toEqual(['Soup', 'Curry']);
    const rice = list.find((item) => item.name === 'rice')!;
    expect(rice.amounts).toEqual(['3 cups', '200 g']);
    expect(byAisle(list).map((group) => group.aisle)).toEqual(['Produce', 'Pantry']);
    expect(listAsText(list)).toContain('- rice (3 cups + 200 g)');
  });
});

describe('bringing recipes in', () => {
  it('reads the recipe sites carry in their pages', () => {
    const block = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Page' },
        {
          '@type': ['Recipe'],
          name: 'Garlic Herb Chicken &amp; Rice',
          image: [{ url: 'https://example.com/a.jpg' }],
          recipeYield: ['4', '4 servings'],
          totalTime: 'PT1H5M',
          recipeIngredient: ['1 cup rice', '2 cloves garlic'],
          recipeInstructions: [
            { '@type': 'HowToSection', name: 'Rice', itemListElement: [{ '@type': 'HowToStep', text: 'Rinse the rice.' }] },
            { '@type': 'HowToStep', text: 'Cook <b>gently</b> for 20 minutes.' },
          ],
        },
      ],
    });
    const recipe = fromJsonLd(['not json', block], 'https://www.example.com/recipe')!;
    expect(recipe).toMatchObject({
      title: 'Garlic Herb Chicken & Rice',
      image: 'https://example.com/a.jpg',
      servings: '4 servings',
      totalMinutes: 65,
      source: 'example.com',
      ingredients: ['1 cup rice', '2 cloves garlic'],
      steps: ['# Rice', 'Rinse the rice.', 'Cook gently for 20 minutes.'],
    });
    expect(isoMinutes('PT45M')).toBe(45);
  });

  it('reads a meal from TheMealDB', () => {
    const recipe = fromMeal({ idMeal: '1', strMeal: 'Lentil Soup', strIngredient1: 'Lentils', strMeasure1: '1 cup', strIngredient2: 'Onion', strMeasure2: '', strIngredient3: '', strInstructions: 'STEP 1\r\nWash the lentils.\r\nSTEP 2\r\nSimmer for 30 minutes.', strMealThumb: 'x.jpg' } as never);
    expect(recipe.ingredients).toEqual(['1 cup Lentils', 'Onion']);
    expect(recipe.steps).toEqual(['Wash the lentils.', 'Simmer for 30 minutes.']);
  });

  it('splits pasted text into ingredients and steps', () => {
    const recipe = fromText('Simple Oats\nServes 2\nIngredients\n1 cup oats\n2 cups milk\nMethod\n1. Warm the milk.\n2. Stir in the oats and cook 5 minutes.');
    expect(recipe.title).toBe('Simple Oats');
    expect(recipe.servings).toBe('2');
    expect(recipe.ingredients).toEqual(['1 cup oats', '2 cups milk']);
    expect(recipe.steps).toEqual(['Warm the milk.', 'Stir in the oats and cook 5 minutes.']);
    const loose = fromText('Toast\n2 slices bread\n1 tbsp butter\nToast the bread until golden, then butter it.');
    expect(loose.ingredients).toEqual(['2 slices bread', '1 tbsp butter']);
    expect(loose.steps).toHaveLength(1);
  });
});

const recipe = (title: string, ingredients: string[]): Recipe => ({ id: title, title, ingredients, steps: [], notes: '', tags: [], createdAt: '', updatedAt: '' });

describe('finding recipes', () => {
  it('matches every word, and finds what uses what is at hand', () => {
    const all = [recipe('Lentil soup', ['1 cup lentils', '1 onion']), recipe('Fried rice', ['2 cups rice', '2 eggs', '1 onion'])];
    expect(searchRecipes(all, 'soup lentils').map((r) => r.title)).toEqual(['Lentil soup']);
    expect(withWhatIHave(all, 'onion, eggs').map((hit) => hit.recipe.title)).toEqual(['Fried rice', 'Lentil soup']);
  });
});

describe('ways to try it', () => {
  it('offers small changes with their sources, and nothing for a plain vegetable dish', () => {
    const ways = waysToTry(recipe('Carbonara', ['200 g spaghetti', '100 g bacon', '2 eggs', '1/2 cup heavy cream']));
    expect(ways.map((way) => way.id)).toEqual(['greens', 'whole-pasta', 'beans', 'cream']);
    expect(ways.every((way) => way.source.length > 10)).toBe(true);
    expect(waysToTry(recipe('Salad', ['2 cups spinach', '1 cucumber', '1 tbsp olive oil']))).toEqual([]);
  });

  it('keeps a line for each day', () => {
    expect(lineFor('2026-10-06')).toEqual(lineFor('2026-10-06'));
    expect(lineFor('2026-10-06')).not.toEqual(lineFor('2026-10-07'));
  });
});

describe('the recipe page reader', () => {
  it('hands back only the structured recipe blocks, the title and the picture', async () => {
    const { handleRecipeRequest } = await import('../../../worker/recipeProxy');
    const page = '<html><head><title>Soup</title><meta property="og:image" content="https://x.com/s.jpg"><script type="application/ld+json">{"@type":"Recipe","name":"Soup"}</script></head><body>…</body></html>';
    const reply = await handleRecipeRequest(new Request('https://proairetos.com/api/recipe?url=https%3A%2F%2Fexample.com%2Fsoup'), async () => new Response(page, { status: 200 }));
    expect(await reply.json()).toMatchObject({ blocks: ['{"@type":"Recipe","name":"Soup"}'], title: 'Soup', image: 'https://x.com/s.jpg' });
    const blocked = await handleRecipeRequest(new Request('https://proairetos.com/api/recipe?url=http%3A%2F%2Flocalhost%2Fx'));
    expect(blocked.status).toBe(400);
  });
});

describe('amounts on the grocery list', () => {
  it('rounds up what is bought whole and writes units plainly', () => {
    const list = addToList([], [{ line: '3.75 cloves garlic' }, { line: '1.25 cup white rice' }, { line: '1.5 onions' }], {}, '', () => Math.random().toString());
    expect(list.map((item) => item.amounts[0])).toEqual(['4 cloves', '1¼ cups', '2']);
  });
});
