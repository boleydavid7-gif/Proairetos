-- Poreia trip workspaces: manual itinerary items and reservation records.
-- The records remain sealed by the existing sync layer and are scoped by user_id.
alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check check (collection in (
  'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
  'schedulePatterns', 'scheduleExceptions', 'decisions',
  'askesisWorkouts', 'askesisPlans',
  'somaRecipes', 'somaGroceries',
  'oikonomiaBills', 'oikonomiaBudgets', 'oikonomiaEnvelopes',
  'poreiaTrips', 'poreiaPlaces', 'poreiaWorkProfiles', 'poreiaPtoAccounts', 'poreiaPtoLedger', 'poreiaLeaveRequests',
  'poreiaItineraryItems', 'poreiaBookings',
  'hydrosDrinks', 'theoriaBooks', 'theoriaNotebooks',
  'preferences', 'attachments'
));
