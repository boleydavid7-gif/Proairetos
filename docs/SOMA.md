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
- Data: IndexedDB `soma` on the phone (recipes, groceries), settings in
  localStorage. Photos from the phone are shrunk to 1200 px and kept with the
  recipe. Not synced yet.
- Look: the family's components (askesis.css) with SOMA's warm tokens
  (`styles/soma.css`): cream and olive in light, forest in dark, following
  Proairetos's Appearance. Photos cut from the owner's sheet
  (`src/soma/assets/scenes`, low resolution; replace with originals). Icon:
  the leaf sprig from the welcome screen.

## Next

- Meal plan: recipes on days, shown in Proairetos Days ahead; the week's
  groceries in one tap.
- Sync with the Proairetos account (new collections, as Askesis did).
- A photo of a recipe card read on the phone (OCR, loaded only when used).
- Askesis link: meals around runs.
- Pictures for recipes without one: a photo taken by the person, or an
  image made by an AI image service through the Worker (needs a key and has a
  cost per image; offered, never automatic).
- Unit conversion (cups and grams, °F and °C).
