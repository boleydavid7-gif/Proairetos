import { itemKey, readIngredient } from './ingredients';
import { isHeading } from './recipes';

/**
 * Kitchen swaps for when something is missing: shown only when asked, for
 * the ingredients a recipe has. Common kitchen equivalents; the baking ones
 * as given in King Arthur Baking's ingredient substitution chart.
 */
export type Swap = { for: string; words: string[]; use: string; source: string };

const KA = 'King Arthur Baking, ingredient substitutions';
const KITCHEN = 'Common kitchen equivalent';

export const swaps: Swap[] = [
  { for: 'Buttermilk', words: ['buttermilk'], use: '1 cup milk with 1 tbsp lemon juice or vinegar, left 5 minutes.', source: KA },
  { for: 'An egg (in baking)', words: ['egg'], use: '1 tbsp ground flaxseed with 3 tbsp water, left 5 minutes.', source: KA },
  { for: 'Self-rising flour', words: ['self-rising flour', 'self-raising flour'], use: '1 cup flour, 1½ tsp baking powder and ¼ tsp salt.', source: KA },
  { for: 'Cake flour', words: ['cake flour'], use: '1 cup flour less 2 tbsp, with 2 tbsp cornstarch.', source: KA },
  { for: 'Brown sugar', words: ['brown sugar'], use: '1 cup white sugar with 1 tbsp molasses.', source: KA },
  { for: 'Baking powder', words: ['baking powder'], use: '¼ tsp baking soda with ½ tsp cream of tartar, for each tsp.', source: KA },
  { for: 'Heavy cream (for cooking)', words: ['heavy cream', 'double cream', 'whipping cream'], use: '¾ cup milk with ¼ cup melted butter. Does not whip.', source: KA },
  { for: 'Sour cream', words: ['sour cream'], use: 'Plain Greek yogurt, the same amount.', source: KITCHEN },
  { for: 'Greek yogurt', words: ['greek yogurt'], use: 'Sour cream, or plain yogurt strained for an hour.', source: KITCHEN },
  { for: 'Fresh herbs', words: ['parsley', 'basil', 'cilantro', 'coriander', 'thyme', 'oregano', 'rosemary', 'dill', 'mint'], use: '1 tsp dried for each tbsp fresh.', source: KITCHEN },
  { for: 'Garlic', words: ['garlic'], use: '⅛ tsp garlic powder for each clove.', source: KITCHEN },
  { for: 'Shallot', words: ['shallot'], use: 'A little onion with a little garlic.', source: KITCHEN },
  { for: 'Lemon juice', words: ['lemon juice', 'lemon'], use: 'Lime juice, or half as much white wine vinegar.', source: KITCHEN },
  { for: 'Wine (in cooking)', words: ['white wine', 'red wine', 'wine'], use: 'Stock with a splash of vinegar.', source: KITCHEN },
  { for: 'Cornstarch (to thicken)', words: ['cornstarch', 'cornflour'], use: '2 tbsp flour for each tbsp.', source: KITCHEN },
  { for: 'Breadcrumbs', words: ['breadcrumbs', 'bread crumbs', 'panko'], use: 'Crushed crackers or rolled oats.', source: KITCHEN },
  { for: 'Honey', words: ['honey'], use: 'Maple syrup, the same amount.', source: KITCHEN },
  { for: 'Maple syrup', words: ['maple syrup'], use: 'Honey, the same amount.', source: KITCHEN },
  { for: 'Butter (for frying)', words: ['butter'], use: 'Olive or other oil, about ¾ as much.', source: KITCHEN },
  { for: 'Soy sauce', words: ['soy sauce'], use: 'Tamari, or coconut aminos (sweeter).', source: KITCHEN },
  { for: 'Rice vinegar', words: ['rice vinegar'], use: 'Apple cider vinegar with a pinch of sugar.', source: KITCHEN },
  { for: 'Stock', words: ['stock', 'broth'], use: 'Water with a little soy sauce, miso or a stock cube.', source: KITCHEN },
  { for: 'Milk', words: ['milk'], use: 'Any plant milk, unsweetened, the same amount.', source: KITCHEN },
  { for: 'Spinach', words: ['spinach'], use: 'Kale or chard, cooked a little longer.', source: KITCHEN },
  { for: 'Canned tomatoes', words: ['canned tomatoes', 'crushed tomatoes', 'diced tomatoes'], use: 'Fresh tomatoes, chopped, cooked down a little longer.', source: KITCHEN },
];

/** Swaps for the ingredients this recipe has; each swap once, the most specific match winning. */
export function swapsFor(ingredients: readonly string[]): { line: string; swap: Swap }[] {
  const out: { line: string; swap: Swap }[] = [];
  const used = new Set<Swap>();
  for (const line of ingredients) {
    if (isHeading(line)) continue;
    const name = ` ${itemKey(readIngredient(line).name)} `;
    const fits = swaps
      .flatMap((swap) => swap.words.filter((word) => name.includes(` ${itemKey(word)} `) || name.includes(` ${itemKey(word)}`)).map((word) => ({ swap, word })))
      .sort((a, b) => b.word.length - a.word.length);
    const best = fits.find(({ swap }) => !used.has(swap));
    // "garlic powder" is not garlic; "milk" inside "buttermilk" is caught by the longer word first.
    if (best && !(best.word === 'garlic' && name.includes('powder'))) {
      used.add(best.swap);
      out.push({ line, swap: best.swap });
    }
  }
  return out;
}
