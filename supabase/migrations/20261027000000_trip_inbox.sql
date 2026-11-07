-- Poreia's forwarding address: confirmation emails sent to trips.<token>@ the site arrive at the Worker, which reads the
-- words and seals them with the public key the person's device made; only the sealed copy is kept here. Poreia opens
-- it on the device, adds the booking to its trip, and deletes it. The token is stored only as its SHA-256.

create table if not exists public.trip_inboxes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique,
  public_key jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.trip_inboxes enable row level security;
drop policy if exists "own trip inbox" on public.trip_inboxes;
create policy "own trip inbox" on public.trip_inboxes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.trip_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sealed text not null check (length(sealed) <= 80000),
  created_at timestamptz not null default now()
);

alter table public.trip_inbox_items enable row level security;
drop policy if exists "own trip inbox items read" on public.trip_inbox_items;
create policy "own trip inbox items read" on public.trip_inbox_items
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own trip inbox items delete" on public.trip_inbox_items;
create policy "own trip inbox items delete" on public.trip_inbox_items
  for delete to authenticated using (user_id = auth.uid());

create index if not exists trip_inbox_items_user on public.trip_inbox_items (user_id, created_at);

-- The public key for a token, so the Worker can seal what arrives. Nothing else is told.
create or replace function public.trip_inbox_key(token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public_key from public.trip_inboxes
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- Keeps one sealed email for the token's owner; at most 100 waiting at a time.
create or replace function public.trip_inbox_add(token text, sealed text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.trip_inboxes
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if owner is null or length(sealed) > 80000 then
    return false;
  end if;
  if (select count(*) from public.trip_inbox_items where user_id = owner) >= 100 then
    return false;
  end if;
  insert into public.trip_inbox_items (user_id, sealed) values (owner, sealed);
  return true;
end;
$$;

revoke all on function public.trip_inbox_key(text) from public;
grant execute on function public.trip_inbox_key(text) to anon, authenticated;
revoke all on function public.trip_inbox_add(text, text) from public;
grant execute on function public.trip_inbox_add(text, text) to anon, authenticated;
