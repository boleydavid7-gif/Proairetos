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
