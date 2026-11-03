-- Per-app household sharing permissions.
--
-- A household's encrypted index names the app lists that are offered to its members. This table makes that choice
-- enforceable by the server as well: once an app list is linked to a household, only the person who enabled the
-- share and current members of that household can read or write it while the share is enabled. Disabling a share
-- blocks future server access; it cannot erase copies already downloaded to another device.

create table if not exists public.household_app_shares (
  household_id uuid not null references public.shared_lists (id) on delete cascade,
  app text not null check (app in ('proairetos', 'soma', 'ergon', 'phyton', 'therapeia')),
  shared_list_id uuid not null references public.shared_lists (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (household_id, app),
  unique (shared_list_id),
  check (household_id <> shared_list_id)
);

alter table public.household_app_shares enable row level security;

drop policy if exists "household members see app shares" on public.household_app_shares;
create policy "household members see app shares" on public.household_app_shares
  for select to authenticated using (
    owner_id = auth.uid() or public.is_list_member(household_id)
  );

create index if not exists household_app_shares_by_list
  on public.household_app_shares (shared_list_id, enabled);

-- The person who enabled a category can change that category. The function is security definer so the app never
-- needs direct write access to the permission table.
create or replace function public.set_household_app_share(household uuid, app_name text, shared_list uuid, share_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_owner uuid;
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if app_name not in ('proairetos', 'soma', 'ergon', 'phyton', 'therapeia') then
    raise exception 'That app cannot be shared with a household.';
  end if;
  if household = shared_list then
    raise exception 'A household cannot share itself as an app list.';
  end if;
  if not exists (
    select 1 from public.shared_list_members
    where list_id = household and user_id = auth.uid()
  ) then
    raise exception 'Join the household before changing its sharing settings.';
  end if;
  if not exists (select 1 from public.shared_lists where id = shared_list) then
    raise exception 'That shared list no longer exists.';
  end if;

  select owner_id into existing_owner
    from public.household_app_shares
    where household_id = household and app = app_name;

  if existing_owner is not null and existing_owner <> auth.uid() then
    raise exception 'Only the person who enabled this share can change it.';
  end if;

  if share_enabled and not exists (
    select 1 from public.shared_list_members
    where list_id = shared_list and user_id = auth.uid()
  ) and not exists (
    select 1 from public.shared_lists
    where id = shared_list and created_by = auth.uid()
  ) then
    raise exception 'You need access to this app list before sharing it.';
  end if;

  insert into public.household_app_shares (household_id, app, shared_list_id, owner_id, enabled, updated_at)
  values (household, app_name, shared_list, auth.uid(), share_enabled, now())
  on conflict (household_id, app) do update
    set shared_list_id = excluded.shared_list_id,
        enabled = excluded.enabled,
        updated_at = now()
    where public.household_app_shares.owner_id = auth.uid();

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Only the person who enabled this share can change it.';
  end if;
  return true;
end;
$$;

revoke all on function public.set_household_app_share(uuid, text, uuid, boolean) from public, anon;
grant execute on function public.set_household_app_share(uuid, text, uuid, boolean) to authenticated;

-- A linked app list is accessible only while its share is enabled and the person remains in the household.
-- The person who enabled it and the list's original creator retain access to their own data.
create or replace function public.is_list_member(list uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.shared_list_members m
    where m.list_id = list
      and m.user_id = auth.uid()
      and (
        exists (
          select 1 from public.shared_lists own
          where own.id = list and own.created_by = auth.uid()
        )
        or not exists (
          select 1 from public.household_app_shares s
          where s.shared_list_id = list
        )
        or exists (
          select 1 from public.household_app_shares s
          where s.shared_list_id = list and s.owner_id = auth.uid()
        )
        or exists (
          select 1
          from public.household_app_shares s
          join public.shared_list_members hm on hm.list_id = s.household_id
          where s.shared_list_id = list
            and s.enabled
            and hm.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.is_list_member(uuid) from public;
grant execute on function public.is_list_member(uuid) to authenticated;

-- A list that has been connected to a household cannot be joined through an old standalone invite while the
-- household sharing switch is off, or by someone who is not a member of that household.
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
  if exists (
    select 1
    from public.household_app_shares s
    where s.shared_list_id = list
      and (
        not s.enabled
        or (
          s.owner_id <> auth.uid()
          and not exists (
            select 1 from public.shared_list_members hm
            where hm.list_id = s.household_id and hm.user_id = auth.uid()
          )
        )
      )
  ) then
    return false;
  end if;
  insert into public.shared_list_members (list_id, user_id)
  values (list, auth.uid())
  on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.join_shared_list(uuid, text) from public;
grant execute on function public.join_shared_list(uuid, text) to authenticated;
