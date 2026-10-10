-- HYDROS hydration entries are sealed on the device before they reach the server.
alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check check (collection in (
  'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
  'schedulePatterns', 'scheduleExceptions', 'decisions',
  'askesisWorkouts', 'askesisPlans',
  'somaRecipes', 'somaGroceries',
  'oikonomiaBills', 'oikonomiaBudgets',
  'hydrosDrinks'
));
