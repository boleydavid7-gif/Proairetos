-- SOMA, the recipe app served beside Proairetos, syncs with the same account
-- and key. Its records (recipes, the grocery list) are sealed on the device
-- like everything else; this only lets the two new collection names in.
-- Until this runs, SOMA records wait on the device and the rest syncs as before.

alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check check (collection in (
  'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
  'schedulePatterns', 'scheduleExceptions', 'decisions',
  'askesisWorkouts', 'askesisPlans',
  'somaRecipes', 'somaGroceries'
));
