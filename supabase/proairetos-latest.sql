-- Proairetos: the three newest server changes, in order. Safe to run more than once.
-- Paste all of this into Supabase > SQL Editor > New query, then Run.

-- ========== 20261016000000_preferences_files_sync ==========
-- Settings and the details of photos and files kept with items join the shared sync ledger,
-- and the bytes of those files get a private, per-person bucket (they arrive already encrypted).
alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check check (collection in (
  'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
  'schedulePatterns', 'scheduleExceptions', 'decisions',
  'askesisWorkouts', 'askesisPlans',
  'somaRecipes', 'somaGroceries',
  'oikonomiaBills', 'oikonomiaBudgets', 'oikonomiaEnvelopes',
  'poreiaTrips', 'poreiaPlaces', 'poreiaWorkProfiles', 'poreiaPtoAccounts', 'poreiaPtoLedger', 'poreiaLeaveRequests',
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

-- ========== 20261017000000_reminder_sources ==========
-- Reminders from every app in the family.
--
-- Each app keeps its own reminder rows (`source`: proairetos, askesis, oikonomia,
-- hydros, praxis), so one app refreshing its times never removes another's.
-- `sealed` carries the words, encrypted on the device with the account key; the
-- server passes it along in the push without being able to read it. Proairetos's
-- service worker opens it, so a reminder written by HYDROS shows its own words
-- on a phone where only Proairetos receives pushes.

alter table public.reminders add column if not exists source text not null default 'proairetos'
  check (char_length(source) <= 20);
alter table public.reminders add column if not exists sealed text
  check (sealed is null or char_length(sealed) <= 1200);

-- ========== 20261022000000_reminder_previews ==========
-- Optional lock-screen previews for Declarative Web Push. The device writes these only when the person chose
-- details on the lock screen; the sealed words remain the service worker's private source of truth.
alter table public.reminders add column if not exists preview_title text
  check (preview_title is null or char_length(preview_title) <= 120);
alter table public.reminders add column if not exists preview_body text
  check (preview_body is null or char_length(preview_body) <= 300);
alter table public.reminders add column if not exists preview_open text
  check (preview_open is null or char_length(preview_open) <= 160);

create index if not exists reminders_source on public.reminders (user_id, source) where sent_at is null;

-- ========== 20261018000000_shared_lists ==========
-- Shared lists (SOMA's grocery list, shared with someone).
--
-- A list's items are sealed on the phone with the list's own key. The key travels only in the invite link,
-- after the `#`, which browsers never send to a server, so the server holds sealed items it cannot read.
-- Members are people on this server who opened the link while signed in; joining proves they hold the key
-- (`join_proof` is a hash of it), so knowing a list's id alone is not enough.

create table if not exists public.shared_lists (
  id uuid primary key,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  join_proof text not null check (char_length(join_proof) <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.shared_list_members (
  list_id uuid not null references public.shared_lists (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists public.shared_list_items (
  list_id uuid not null references public.shared_lists (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  sealed text not null check (char_length(sealed) <= 4000),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (list_id, id)
);

alter table public.shared_lists enable row level security;
alter table public.shared_list_members enable row level security;
alter table public.shared_list_items enable row level security;

-- Whether the person asking belongs to a list (security definer, so policies can ask it without recursion).
create or replace function public.is_list_member(list uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.shared_list_members where list_id = list and user_id = auth.uid());
$$;

drop policy if exists "members see their lists" on public.shared_lists;
create policy "members see their lists" on public.shared_lists
  for select to authenticated using (created_by = auth.uid() or public.is_list_member(id));
drop policy if exists "people make their own lists" on public.shared_lists;
create policy "people make their own lists" on public.shared_lists
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "the maker can remove a list" on public.shared_lists;
create policy "the maker can remove a list" on public.shared_lists
  for delete to authenticated using (created_by = auth.uid());

drop policy if exists "members see who else is on a list" on public.shared_list_members;
create policy "members see who else is on a list" on public.shared_list_members
  for select to authenticated using (public.is_list_member(list_id));
drop policy if exists "the maker joins their own list" on public.shared_list_members;
create policy "the maker joins their own list" on public.shared_list_members
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.shared_lists where id = list_id and created_by = auth.uid())
  );
drop policy if exists "anyone can leave" on public.shared_list_members;
create policy "anyone can leave" on public.shared_list_members
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "members read and write items" on public.shared_list_items;
create policy "members read and write items" on public.shared_list_items
  for all to authenticated using (public.is_list_member(list_id)) with check (public.is_list_member(list_id));

-- Joining from an invite: the proof must match the list's, then the person is added.
create or replace function public.join_shared_list(list uuid, proof text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if not exists (select 1 from public.shared_lists where id = list and join_proof = proof) then
    return false;
  end if;
  insert into public.shared_list_members (list_id, user_id) values (list, auth.uid()) on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.join_shared_list(uuid, text) from public;
grant execute on function public.join_shared_list(uuid, text) to authenticated;
revoke all on function public.is_list_member(uuid) from public;
grant execute on function public.is_list_member(uuid) to authenticated;

create index if not exists shared_list_items_changed on public.shared_list_items (list_id, updated_at);


-- ========== 20261023000000_passkey_first ==========
-- An account can be set up with a passkey alone: the data key is wrapped by the passkey (in passkeys.wrap) and by
-- the recovery key, with no passphrase. A passphrase can still be added later from Account.
alter table public.user_keys alter column passphrase_wrap drop not null;

-- ========== 20261024000000_capture_inbox ==========
-- Capture from anywhere: a Shortcut (Siri, Back Tap, Apple Watch) sends words to the site with the person's inbox
-- token; the site's Worker seals them with the public key the person's device made, and keeps only the sealed words
-- here. Proairetos opens them with the private key (on the device) and moves them into Capture, then deletes them.
-- The token is stored only as its SHA-256; the public key is not secret.

create table if not exists public.capture_inboxes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique,
  public_key jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.capture_inboxes enable row level security;
drop policy if exists "own inbox" on public.capture_inboxes;
create policy "own inbox" on public.capture_inboxes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.capture_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sealed text not null check (length(sealed) <= 12000),
  created_at timestamptz not null default now()
);

alter table public.capture_inbox_items enable row level security;
drop policy if exists "own inbox items read" on public.capture_inbox_items;
create policy "own inbox items read" on public.capture_inbox_items
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own inbox items delete" on public.capture_inbox_items;
create policy "own inbox items delete" on public.capture_inbox_items
  for delete to authenticated using (user_id = auth.uid());

create index if not exists capture_inbox_items_user on public.capture_inbox_items (user_id, created_at);

-- The public key for a token, so the Worker can seal what arrives. Nothing else is told.
create or replace function public.inbox_key(token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public_key from public.capture_inboxes
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- Keeps one sealed capture for the token's owner; at most 200 waiting at a time.
create or replace function public.inbox_add(token text, sealed text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.capture_inboxes
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if owner is null or length(sealed) > 12000 then
    return false;
  end if;
  if (select count(*) from public.capture_inbox_items where user_id = owner) >= 200 then
    return false;
  end if;
  insert into public.capture_inbox_items (user_id, sealed) values (owner, sealed);
  return true;
end;
$$;

revoke all on function public.inbox_key(text) from public;
grant execute on function public.inbox_key(text) to anon, authenticated;
revoke all on function public.inbox_add(text, text) from public;
grant execute on function public.inbox_add(text, text) to anon, authenticated;
