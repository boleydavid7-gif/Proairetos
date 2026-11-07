-- Settings and the details of photos and files kept with items join the shared sync ledger,
-- and the bytes of those files get a private, per-person bucket (they arrive already encrypted).
alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check check (collection in (
  'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
  'schedulePatterns', 'scheduleExceptions', 'decisions',
  'askesisWorkouts', 'askesisPlans',
  'somaRecipes', 'somaGroceries',
  'oikonomiaBills', 'oikonomiaBudgets',
  'hydrosDrinks', 'theoriaBooks', 'theoriaNotebooks',
  'preferences', 'attachments'
));

insert into storage.buckets (id, name, public, file_size_limit)
values ('proairetos-files', 'proairetos-files', false, 12000000)
on conflict (id) do update set public = false, file_size_limit = 12000000;

-- A person can read, write and delete only files under a folder named for their own id.
drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id = 'proairetos-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files write" on storage.objects;
create policy "own files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'proairetos-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files update" on storage.objects;
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id = 'proairetos-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'proairetos-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'proairetos-files' and (storage.foldername(name))[1] = auth.uid()::text);
