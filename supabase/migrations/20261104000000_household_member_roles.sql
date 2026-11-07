-- Family member roles and permissioned membership management.
--
-- The household creator is the owner (derived from shared_lists.created_by). Members are members by default;
-- only administrators need a row in household_member_roles. This keeps role metadata server-authoritative while
-- names and email display details remain end-to-end encrypted in the household list.

-- Tie email invitations to a household so the server can enforce owner/admin permissions.
alter table public.household_invites
  add column if not exists household_id uuid references public.shared_lists (id) on delete cascade;

create table if not exists public.household_member_roles (
  household_id uuid not null references public.shared_lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  granted_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.household_member_roles enable row level security;

drop policy if exists "household members can see member roles" on public.household_member_roles;
create policy "household members can see member roles" on public.household_member_roles
  for select to authenticated using (public.is_list_member(household_id));

-- No direct insert/update/delete policies. All role changes go through the owner-only function below.

create or replace function public.can_manage_household(household uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.shared_lists l
      where l.id = household and l.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.household_member_roles r
      join public.shared_list_members m
        on m.list_id = r.household_id and m.user_id = r.user_id
      where r.household_id = household
        and r.user_id = auth.uid()
        and r.role = 'admin'
    )
  );
$$;

revoke all on function public.can_manage_household(uuid) from public, anon;
grant execute on function public.can_manage_household(uuid) to authenticated;

create or replace function public.set_household_member_role(household uuid, target_user uuid, new_role text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select created_by into owner_id from public.shared_lists where id = household;
  if owner_id is null or owner_id <> auth.uid() then
    raise exception 'Only the household owner can change administrator roles.';
  end if;
  if target_user is null or target_user = owner_id then
    raise exception 'The household owner role cannot be changed.';
  end if;
  if new_role is null or new_role not in ('admin', 'member') then
    raise exception 'Choose administrator or member.';
  end if;
  if not exists (
    select 1 from public.shared_list_members
    where list_id = household and user_id = target_user
  ) then
    raise exception 'That person is no longer a member of this household.';
  end if;

  if new_role = 'admin' then
    insert into public.household_member_roles (household_id, user_id, role, granted_by, updated_at)
    values (household, target_user, 'admin', auth.uid(), now())
    on conflict (household_id, user_id) do update
      set role = 'admin', granted_by = auth.uid(), updated_at = now();
  else
    delete from public.household_member_roles
    where household_id = household and user_id = target_user;
  end if;
  return true;
end;
$$;

revoke all on function public.set_household_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_household_member_role(uuid, uuid, text) to authenticated;

create or replace function public.remove_household_member(household uuid, target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  actor_is_admin boolean;
  target_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select created_by into owner_id from public.shared_lists where id = household;
  if owner_id is null then
    raise exception 'That household no longer exists.';
  end if;
  if target_user is null or target_user = owner_id then
    raise exception 'The household owner cannot be removed.';
  end if;
  if target_user = auth.uid() then
    raise exception 'Use Leave household to remove yourself.';
  end if;

  actor_is_admin := public.can_manage_household(household)
    and owner_id <> auth.uid();
  if owner_id <> auth.uid() and not actor_is_admin then
    raise exception 'Only the owner or an administrator can remove members.';
  end if;

  select exists (
    select 1 from public.household_member_roles
    where household_id = household and user_id = target_user and role = 'admin'
  ) into target_is_admin;
  if actor_is_admin and target_is_admin then
    raise exception 'Administrators cannot remove another administrator.';
  end if;
  if not exists (
    select 1 from public.shared_list_members
    where list_id = household and user_id = target_user
  ) then
    raise exception 'That person is no longer a member of this household.';
  end if;

  delete from public.household_member_roles
  where household_id = household and user_id = target_user;
  delete from public.shared_list_members
  where list_id = household and user_id = target_user;
  delete from public.household_invites
  where household_id = household and (to_user = target_user or from_user = target_user);
  return true;
end;
$$;

revoke all on function public.remove_household_member(uuid, uuid) from public, anon;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

create index if not exists household_invites_household
  on public.household_invites (household_id, created_at);

create unique index if not exists household_invites_one_pending_per_person
  on public.household_invites (household_id, to_user)
  where household_id is not null;

drop policy if exists "send an invite" on public.household_invites;
create policy "send an invite" on public.household_invites
  for insert to authenticated with check (
    from_user = auth.uid()
    and household_id is not null
    and public.can_manage_household(household_id)
    and to_user <> auth.uid()
    and (select count(*) from public.household_invites where from_user = auth.uid()) < 50
  );

-- Email lookup is also a privileged part of inviting, not a public account-discovery endpoint.
revoke all on function public.invitee_key(text) from public, anon, authenticated;

create or replace function public.invitee_key(address text, household uuid)
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
  if not public.can_manage_household(household) then
    raise exception 'Only the owner or an administrator can invite people.';
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

revoke all on function public.invitee_key(text, uuid) from public, anon;
grant execute on function public.invitee_key(text, uuid) to authenticated;


-- A departing member should not regain administrator status if they are invited back later.
-- This trigger is harmless for ordinary app lists because only household ids have role/invite metadata.
create or replace function public.cleanup_household_member_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.household_member_roles
  where household_id = old.list_id and user_id = old.user_id;
  delete from public.household_invites
  where household_id = old.list_id and (from_user = old.user_id or to_user = old.user_id);
  return old;
end;
$$;

revoke all on function public.cleanup_household_member_role() from public, anon, authenticated;

drop trigger if exists cleanup_household_member_role_after_leave on public.shared_list_members;
create trigger cleanup_household_member_role_after_leave
  after delete on public.shared_list_members
  for each row execute function public.cleanup_household_member_role();
