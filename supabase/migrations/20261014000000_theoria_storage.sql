-- Theoria's private source storage. Files live beneath the owner's auth id;
-- the browser receives a short-lived signed URL only after an ownership check.

insert into storage.buckets (id, name, public)
values ('theoria-books', 'theoria-books', false),
       ('theoria-covers', 'theoria-covers', false),
       ('theoria-exports', 'theoria-exports', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "theoria books read" on storage.objects;
create policy "theoria books read" on storage.objects
  for select to authenticated
  using (bucket_id = 'theoria-books' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "theoria books write" on storage.objects;
create policy "theoria books write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'theoria-books' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "theoria books update" on storage.objects;
create policy "theoria books update" on storage.objects
  for update to authenticated
  using (bucket_id = 'theoria-books' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'theoria-books' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "theoria books delete" on storage.objects;
create policy "theoria books delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'theoria-books' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "theoria covers read" on storage.objects;
create policy "theoria covers read" on storage.objects
  for select to authenticated
  using (bucket_id = 'theoria-covers' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "theoria covers write" on storage.objects;
create policy "theoria covers write" on storage.objects
  for all to authenticated
  using (bucket_id = 'theoria-covers' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'theoria-covers' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "theoria exports own" on storage.objects;
create policy "theoria exports own" on storage.objects
  for all to authenticated
  using (bucket_id = 'theoria-exports' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'theoria-exports' and (storage.foldername(name))[1] = (select auth.uid()::text));
