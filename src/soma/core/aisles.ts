/**
 * Which part of the shop an ingredient is usually in, from a word list kept
 * on the phone. The first matching phrase wins, so "chicken stock" is found
 * before "chicken" and "bell pepper" before "pepper". The person can move
 * any item, and the app remembers their choice (`AisleChoices`).
 */
export type Aisle = 'Produce' | 'Meat & fish' | 'Dairy & eggs' | 'Bakery' | 'Pantry' | 'Spices' | 'Frozen' | 'Drinks' | 'Other';

export const aisles: Aisle[] = ['Produce', 'Meat & fish', 'Dairy & eggs', 'Bakery', 'Pantry', 'Spices', 'Frozen', 'Drinks', 'Other'];

const rules: [string, Aisle][] = [
  // Phrases that would otherwise land in the wrong place.
  ['frozen', 'Frozen'],
  // Tofu and tempeh sit in the chilled part of produce in most shops.
  ['tofu', 'Produce'],
  ['tempeh', 'Produce'],
  ['lemon', 'Produce'],
  ['lime', 'Produce'],
  ['salt and pepper', 'Spices'],
  ['rolled oats', 'Pantry'],
  ['pearl', 'Pantry'],
  ['baking soda', 'Pantry'],
  ['baking powder', 'Pantry'],
  ['melon', 'Produce'],
  ['butternut', 'Produce'],
  ['ice cream', 'Frozen'],
  ['stock', 'Pantry'],
  ['broth', 'Pantry'],
  ['bouillon', 'Pantry'],
  ['coconut milk', 'Pantry'],
  ['peanut butter', 'Pantry'],
  ['almond butter', 'Pantry'],
  ['tomato paste', 'Pantry'],
  ['tomato sauce', 'Pantry'],
  ['canned', 'Pantry'],
  ['tinned', 'Pantry'],
  ['chopped tomatoes', 'Pantry'],
  ['crushed tomatoes', 'Pantry'],
  ['diced tomatoes', 'Pantry'],
  ['garlic powder', 'Spices'],
  ['onion powder', 'Spices'],
  ['chili powder', 'Spices'],
  ['chilli powder', 'Spices'],
  ['red pepper flakes', 'Spices'],
  ['black pepper', 'Spices'],
  ['white pepper', 'Spices'],
  ['peppercorn', 'Spices'],
  ['bell pepper', 'Produce'],
  ['sweet pepper', 'Produce'],
  ['jalapeño', 'Produce'],
  ['jalapeno', 'Produce'],
  ['lemon juice', 'Produce'],
  ['lime juice', 'Produce'],
  ['orange juice', 'Drinks'],
  ['sour cream', 'Dairy & eggs'],
  ['cream cheese', 'Dairy & eggs'],
  ['greek yogurt', 'Dairy & eggs'],
  ['bread crumbs', 'Pantry'],
  ['breadcrumbs', 'Pantry'],
  ['panko', 'Pantry'],
  ['dried', 'Spices'],
  ['ground cumin', 'Spices'],
  ['ground cinnamon', 'Spices'],
  ['ground ginger', 'Spices'],
  ['ground turkey', 'Meat & fish'],
  ['ground beef', 'Meat & fish'],
  ['ground pork', 'Meat & fish'],
  // Produce
  ...[
    'apple', 'avocado', 'banana', 'basil', 'bean sprout', 'beet', 'berries', 'blueberr', 'broccoli', 'brussels', 'cabbage',
    'carrot', 'cauliflower', 'celery', 'chard', 'cilantro', 'coriander leaves', 'corn on', 'courgette', 'cucumber',
    'dill', 'eggplant', 'aubergine', 'fennel', 'garlic', 'ginger', 'grape', 'green onion', 'herbs', 'kale', 'leek', 'lemon',
    'lettuce', 'lime', 'mango', 'mint', 'mushroom', 'onion', 'orange', 'parsley', 'peach', 'pear', 'potato', 'pumpkin',
    'radish', 'raspberr', 'rocket', 'arugula', 'rosemary', 'sage', 'scallion', 'shallot', 'spinach', 'squash',
    'strawberr', 'sweet potato', 'thyme', 'tomato', 'zucchini', 'chive', 'pepper', 'chili', 'chilli', 'salad', 'greens',
  ].map((word): [string, Aisle] => [word, 'Produce']),
  // Meat & fish
  ...[
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham', 'steak', 'mince', 'salmon', 'tuna', 'cod',
    'shrimp', 'prawn', 'fish', 'tilapia', 'halibut', 'scallop', 'mussel', 'clam', 'crab', 'anchov', 'chorizo', 'prosciutto',
    'tofu', 'tempeh',
  ].map((word): [string, Aisle] => [word, 'Meat & fish']),
  // Dairy & eggs
  ...['milk', 'butter', 'cream', 'cheese', 'parmesan', 'mozzarella', 'feta', 'cheddar', 'ricotta', 'yogurt', 'yoghurt', 'egg', 'ghee'].map(
    (word): [string, Aisle] => [word, 'Dairy & eggs'],
  ),
  // Bakery
  ...['bread', 'baguette', 'bun', 'roll', 'tortilla', 'pita', 'naan', 'wrap', 'bagel', 'croissant'].map((word): [string, Aisle] => [word, 'Bakery']),
  // Spices
  ...[
    'salt', 'cumin', 'paprika', 'oregano', 'cinnamon', 'nutmeg', 'turmeric', 'curry', 'cayenne', 'bay lea', 'clove',
    'cardamom', 'coriander', 'garam masala', 'seasoning', 'vanilla', 'saffron', 'allspice', 'star anise', 'fenugreek',
  ].map((word): [string, Aisle] => [word, 'Spices']),
  // Drinks
  ...['wine', 'beer', 'juice', 'coffee', 'tea', 'sparkling water', 'soda'].map((word): [string, Aisle] => [word, 'Drinks']),
  // Pantry
  ...[
    'flour', 'sugar', 'honey', 'maple', 'syrup', 'oil', 'vinegar', 'rice', 'pasta', 'spaghetti', 'noodle', 'oats', 'quinoa',
    'lentil', 'bean', 'chickpea', 'couscous', 'barley', 'bulgur', 'cereal', 'nut', 'almond', 'walnut', 'pecan', 'cashew',
    'peanut', 'seed', 'raisin', 'date', 'chocolate', 'cocoa', 'baking', 'yeast', 'soy sauce', 'tamari', 'mustard', 'ketchup',
    'mayo', 'sauce', 'salsa', 'pesto', 'stock', 'olive', 'caper', 'tahini', 'miso', 'cornstarch', 'cornflour', 'jam',
    'crackers', 'tortilla chips', 'water',
  ].map((word): [string, Aisle] => [word, 'Pantry']),
];

/** Choices the person made, by item name (lower case): moving "tofu" to Produce sticks. */
export type AisleChoices = Record<string, Aisle>;

export function aisleFor(name: string, choices: AisleChoices = {}): Aisle {
  const lower = name.toLowerCase();
  const chosen = choices[lower.trim()];
  if (chosen) return chosen;
  for (const [word, aisle] of rules) if (lower.includes(word)) return aisle;
  return 'Other';
}
