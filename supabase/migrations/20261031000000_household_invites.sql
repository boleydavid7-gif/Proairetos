-- Household invites by email.
--
-- Each account gets a key pair, made on the person's device once their data is open. The public half is kept here so
-- others can seal something only that person can open; the private half is kept here too, but sealed with the
-- account's own data key, which the server never has. An invite carries the household's list id and key sealed to
-- the invitee's public key, so the server holds an invite it cannot read. Needs 20261018000000_shared_lists.sql.

create table if not exists public.account_keys (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  public_key jsonb not null,
  sealed_private text not null check (char_length(sealed_private) <= 8000),
  updated_at timestamptz not null default now()
);

alter table public.account_keys enable row level security;

drop policy if exists "own account key" on public.account_keys;
create policy "own account key" on public.account_keys
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Each lookup by email is noted, so the lookup cannot be used to list who has an account.
create table if not exists public.account_key_lookups (
  user_id uuid not null references auth.users (id) on delete cascade,
  looked_at timestamptz not null default now()
);

alter table public.account_key_lookups enable row level security;
-- No policies: only the function below reads and writes it.

create index if not exists account_key_lookups_by_user on public.account_key_lookups (user_id, looked_at);

-- The public key of the account with this email, for a signed-in person (at most 30 lookups an hour).
-- Null when there is no such account, or it has not made its key yet (opened its data on this version).
create or replace function public.invitee_key(address text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  found jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if (select count(*) from public.account_key_lookups where user_id = auth.uid() and looked_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many lookups. Try again in an hour.';
  end if;
  insert into public.account_key_lookups (user_id) values (auth.uid());
  delete from public.account_key_lookups where looked_at < now() - interval '1 day';
  select jsonb_build_object('user_id', k.user_id, 'public_key', k.public_key)
    into found
    from auth.users u
    join public.account_keys k on k.user_id = u.id
    where lower(u.email) = lower(trim(address)) and u.id <> auth.uid()
    limit 1;
  return found;
end;
$$;

revoke all on function public.invitee_key(text) from public, anon;
grant execute on function public.invitee_key(text) to authenticated;

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  to_user uuid not null references auth.users (id) on delete cascade,
  to_email text not null check (char_length(to_email) <= 254),
  from_user uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sealed text not null check (char_length(sealed) <= 6000),
  created_at timestamptz not null default now()
);

alter table public.household_invites enable row level security;

create index if not exists household_invites_to on public.household_invites (to_user);
create index if not exists household_invites_from on public.household_invites (from_user);

drop policy if exists "send an invite" on public.household_invites;
create policy "send an invite" on public.household_invites
  for insert to authenticated with check (
    from_user = auth.uid()
    and to_user <> auth.uid()
    and (select count(*) from public.household_invites where from_user = auth.uid()) < 50
  );

drop policy if exists "see invites sent or received" on public.household_invites;
create policy "see invites sent or received" on public.household_invites
  for select to authenticated using (to_user = auth.uid() or from_user = auth.uid());

drop policy if exists "remove invites sent or received" on public.household_invites;
create policy "remove invites sent or received" on public.household_invites
  for delete to authenticated using (to_user = auth.uid() or from_user = auth.uid());
