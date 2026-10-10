# SOMA by Proairetos

A recipe manager that keeps the Proairetos way with food: it records, it
never judges. No calories, no scores, no "good" or "bad" food. Served at
`/soma/` from this repository (`soma/index.html` -> `src/soma/`).

## Built (first version)

- **Import** (`ImportPage`): from a link (the Worker bridge `/api/recipe`,
  `worker/recipeProxy.ts`, fetches the page and returns only its schema.org
  Recipe JSON-LD, title and picture; `core/importRecipe.ts` `fromJsonLd`), or
  pasted text (`fromText`: headings or the look of each line). Either way the
  recipe opens in Edit to look over before it is kept.
- **Ideas** (tab): TheMealDB (themealdb.com, free open recipe database):
  kinds (Vegetarian, Vegan, Seafood…), search by dish or ingredient; a meal
  opens in Edit (`fromMeal`).
- **A recipe in tabs**: Ingredients (servings scale every amount,
  `core/ingredients.ts` `scaleLine`; tick while gathering; Add to groceries,
  everything chosen except Usually have), Steps (tap-to-start timers from
  "simmer 15 minutes", `timersIn`, `app/timers.ts` rings a bell; Cook step by
  step, screen kept awake), Notes (your own words, and **Ways to try it**:
  `core/tryIt.ts`, small optional changes with their sources: Harvard Healthy
  Eating Plate, WHO, Dietary Guidelines; "Keep in my notes", undo).
- **I cooked this**: records the day; optional "How did you feel after?" kept
  in Proairetos Reflect (promptKey `after-meal`).
- **Groceries**: by aisle (`core/aisles.ts`, word list on the phone, the
  person's moves remembered) or by recipe; the same thing from two recipes is
  one line, same units add, whole things round up; tick, Clear ticked (undo),
  Share as text; "I usually have this".
- **Home**: search, Import / Add / My recipes / Groceries, favourites or
  recent, "What can I make with…", Ideas, a Stoic line on food a day
  (`core/lines.ts`, Musonius Rufus, Epictetus, Seneca; "after" marks a close
  rendering).
- **More**: Usually have, Settings (daily line, ways to try it), Your data
  (backup file, restore, remove everything with undo), About and sources.
- **Units**: Settings can show measured ingredients, cooking steps, grocery
  amounts, and explicit oven temperatures in their original wording, metric,
  or US units. The saved recipe always keeps the imported wording.
- Data: the Proairetos database on the phone (stores `somaRecipes`,
  `somaGroceries`, DB 8), settings in localStorage. Synced, sealed, with the
  same account as Proairetos once the server has
  `20261010000000_soma_sync.sql`. The first version's `soma` database moves
  over once and is deleted. Photos from the phone are shrunk to 1200 px and
  kept with the recipe. In the family backup and the daily copies.
- Look: the family's components (askesis.css) with SOMA's warm tokens
  (`styles/soma.css`): cream and olive in light, forest in dark, following
  Proairetos's Appearance. Photos cut from the owner's sheet
  (`src/soma/assets/scenes`, low resolution; replace with originals). Icon:
  the leaf sprig from the welcome screen.

## A kitchen companion (decide, prepare, nourish)

- **What can I make tonight?** (`TonightPage`, `core/tonight.ts`): time,
  energy (starts from the Proairetos energy word for today), familiar or new,
  each skippable; three of the person's own recipes at a time, kitchen first,
  plain facts ("30 min · uses spinach · last cooked Sep 20"), "Some others".
- **Your day, from Proairetos** (`app/proairetos.ts`, `core/dayShape.ts`):
  reads the schedule (never writes). A committed block through 17:00-20:00
  today shows its own name ("Class until 9:00 PM") and opens Tonight at 30
  min; two or more late blocks in the next four days offer "Cook once, eat
  twice?" (the week, Make ahead marks first). Settings switch.
- **The kitchen** (Groceries > In the kitchen, `core/kitchen.ts`): Put away
  moves ticked items there with the day; "Bought Tuesday" facts, oldest
  first; Used up (undo); added by hand. Kept in the groceries store
  (`place: 'kitchen'`), so it syncs with no new migration.
- **A loose week** (`WeekPage`, `core/week.ts`, `Recipe.planned` days):
  seven days from today, Add from your recipes (search, marks), × with undo;
  "Groceries for these" leaves out Usually have and the kitchen. Plan it for
  a day from a recipe. Proairetos shows planned meals in Days ahead.
- **Your marks** (`Recipe.marks`: Quick, Comfort, For others, Make ahead,
  Light) on the recipe page; the first line of your note shows at the top.
- **Cook mode**: Before you start (what to take out, oven heat from the
  steps), amounts beside each ingredient's first mention in the steps (not
  when the step gives one), measured amounts in steps scale with servings
  (`core/cookAids.ts`); several named timers (`timerName`) in a tray, bells
  handed to the audio clock so they ring with the screen locked
  (`app/timers.ts`); Read aloud; Say "next" / "back" / "again" (speech
  recognition where the phone has it).
- **Missing something?** (`core/swaps.ts`): swaps for this recipe's
  ingredients, only when asked; King Arthur Baking for baking ones.
- **A moment before eating** (`PausePage`): after Finished, at most once a
  day, 30 s breathing circle and Epictetus (Enchiridion 15). Settings switch.
- **Cooked for** (`Recipe.cookedFor`): after I cooked this, Compass people
  or any name; Proairetos Reflect shows "Cooked for Mom" (Today part `soma`).
- **In season** (`core/seasons.ts`, after USDA SNAP-Ed): on Home with your
  recipes that use it; south of the equator when the weather place is.
- **Share** a recipe as text (the paste import reads it back).

## Reading recipes well

- Ingredient lines (`core/ingredients.ts` `readIngredient`): "½ cup plus 2 tbsp
  flour" is flour; "1 can (15 oz) beans" keeps the size as a note; "Juice of 1
  lemon" is a lemon; size words (large, medium) and uses ("to taste", "for
  garnish") become notes; units agree with amounts when scaled ("2 cups").
- Groceries (`boughtAs`): lemon, lime and orange juice are bought as the fruit
  (about 3, 2 and 6 tbsp each); ranges add at both ends ("3–4 cups"); tofu and
  tempeh sit with produce.
- Pasted recipes (`fromText`): "For the sauce:" lines become headings, a Notes
  section goes to notes, "Prep 20 min | Cook 30 min" fills the times
  (`labelledMinutes`).
- Units: As written, Metric or US, on the recipe page and in Settings. Metric
  weighs flour, sugar, butter, oats, rice, cocoa, nuts, cheese and yogurt in
  grams (`weightPerCup`, after King Arthur Baking's weight chart); US measures
  those grams in cups to the nearest quarter. Oven heats round to the dial
  (350°F is 180°C).
- No stand-in pictures: a recipe without its own photo shows a card in its
  colour with its first letter (`app/DishImage.tsx`, `tintOf`); its page opens
  with a soft band in that colour instead of a photo.

## In season

- Home's In season card (a few photos, the month's names, how many of your
  recipes use them) opens `SeasonPage`: the month's vegetables, fruit and herbs
  as photo tiles (`core/seasons.ts` `produce`: ~45 items with months, words to
  find them in recipes, TheMealDB photo name, a keeping note), and Coming next
  month. South of the equator the months turn half a year round (weather place).
- Each opens `ProducePage`: when it is at its best, Keeping it (after the USDA
  FoodKeeper and common practice), Add to groceries, your recipes with it
  (whole words and plurals; "pea" never finds peanut), and ideas from TheMealDB
  (`app/mealdb.ts` `mealsWith`, opened as a draft to look over).
- Photos are TheMealDB's ingredient pictures, loaded when shown; only fresh
  ones (no jars or tins: chives and sweetcorn have none); offline or without
  one, a soft card with the first letter.

## Next

- A photo of a recipe card read on the phone (OCR, loaded only when used).
- Askesis link: meals around runs.
- Pictures for recipes without one: a photo taken by the person, or an
  image made by an AI image service through the Worker (needs a key and has a
  cost per image; offered, never automatic).
- AI help, only on a tap: images, tidying a pasted recipe, a draft from
  what is in the kitchen.
