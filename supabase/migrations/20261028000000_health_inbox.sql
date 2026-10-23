-- Apple Health: Health Auto Export posts the person's export to /api/health/<token>. The site's Worker reads out only
-- what the family's apps keep, seals it with the public key the person's device made, and keeps only the sealed copy
-- here. Their apps open it, add what is new to Askesis, Diaita, Hydros and Therapeia, and delete it.
-- The token is stored only as its SHA-256. `sealed_key` is the token and private key sealed with the account's own key
-- on the device, so every app and device signed in to the account can open what arrives; the server cannot.

create table if not exists public.health_inboxes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique,
  public_key jsonb not null,
  sealed_key text not null,
  created_at timestamptz not null default now()
);

alter table public.health_inboxes enable row level security;
drop policy if exists "own health inbox" on public.health_inboxes;
create policy "own health inbox" on public.health_inboxes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.health_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sealed text not null check (length(sealed) <= 400000),
  created_at timestamptz not null default now()
);

alter table public.health_inbox_items enable row level security;
drop policy if exists "own health items read" on public.health_inbox_items;
create policy "own health items read" on public.health_inbox_items
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own health items delete" on public.health_inbox_items;
create policy "own health items delete" on public.health_inbox_items
  for delete to authenticated using (user_id = auth.uid());

create index if not exists health_inbox_items_user on public.health_inbox_items (user_id, created_at);

-- The public key for a token, so the Worker can seal what arrives. Nothing else is told.
create or replace function public.health_inbox_key(token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public_key from public.health_inboxes
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- Keeps one sealed part for the token's owner; at most 500 waiting at a time.
create or replace function public.health_inbox_add(token text, sealed text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.health_inboxes
  where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if owner is null or length(sealed) > 400000 then
    return false;
  end if;
  if (select count(*) from public.health_inbox_items where user_id = owner) >= 500 then
    return false;
  end if;
  insert into public.health_inbox_items (user_id, sealed) values (owner, sealed);
  return true;
end;
$$;

revoke all on function public.health_inbox_key(text) from public;
grant execute on function public.health_inbox_key(text) to anon, authenticated;
revoke all on function public.health_inbox_add(text, text) from public;
grant execute on function public.health_inbox_add(text, text) to anon, authenticated;
