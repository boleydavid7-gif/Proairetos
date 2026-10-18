-- Poreia trip savings plans. If Oikonomia is available, the client mirrors the plan
-- into its shared Vacation envelope; this collection keeps the Poreia plan itself.
alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check check (collection in (
  'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
  'schedulePatterns', 'scheduleExceptions', 'decisions',
  'askesisWorkouts', 'askesisPlans',
  'somaRecipes', 'somaGroceries',
  'oikonomiaBills', 'oikonomiaBudgets', 'oikonomiaEnvelopes',
  'poreiaTrips', 'poreiaPlaces', 'poreiaWorkProfiles', 'poreiaPtoAccounts', 'poreiaPtoLedger', 'poreiaLeaveRequests',
  'poreiaItineraryItems', 'poreiaBookings', 'poreiaSavingsPlans',
  'hydrosDrinks', 'theoriaBooks', 'theoriaNotebooks',
  'preferences', 'attachments'
));
