-- Children in a household (people 13 and over; accounts under 13 are a later, parent-controlled step).
--
-- Roles: the owner (the creator, also a parent), parents (stored as 'admin'), ordinary members (no row), and
-- children (stored as 'child'). A child cannot manage the household. For each shared app a parent chooses what
-- children may do there (household_part_access). Shared lists are sealed end to end and every member holds the
-- list key, so the server cannot see what a write is: the level is kept on the server (only parents set it) and
-- followed by the devices, which is a guard against accidents, not against a modified client.

alter table public.household_member_roles drop constraint if exists household_member_roles_role_check;
alter table public.household_member_roles
  add constraint household_member_roles_role_check check (role in ('admin', 'child'));

create table if not exists public.household_part_access (
  household_id uuid not null references public.shared_lists (id) on delete cascade,
  app text not null,
  child_level text not null check (child_level in ('none', 'view', 'add', 'edit')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (household_id, app)
);

alter table public.household_part_access enable row level security;

drop policy if exists "household members can see child levels" on public.household_part_access;
create policy "household members can see child levels" on public.household_part_access
  for select to authenticated using (public.is_list_member(household_id));

-- No direct writes: levels change only through the function below.

create or replace function public.set_household_child_level(household uuid, app_name text, new_level text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if not public.can_manage_household(household) then
    raise exception 'Only a parent can choose what children can do.';
  end if;
  if new_level is null or new_level not in ('none', 'view', 'add', 'edit') then
    raise exception 'Choose what children can do.';
  end if;
  if app_name is null or app_name !~ '^[a-z]{3,20}$' then
    raise exception 'Choose an app.';
  end if;
  insert into public.household_part_access (household_id, app, child_level, updated_by, updated_at)
  values (household, app_name, new_level, auth.uid(), now())
  on conflict (household_id, app) do update
    set child_level = excluded.child_level, updated_by = auth.uid(), updated_at = now();
  return true;
end;
$$;

revoke all on function public.set_household_child_level(uuid, text, text) from public, anon;
grant execute on function public.set_household_child_level(uuid, text, text) to authenticated;

-- The owner sets any role. A parent may make an ordinary member a child, or a child an ordinary member, but never
-- changes a parent or the owner.
create or replace function public.set_household_member_role(household uuid, target_user uuid, new_role text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select created_by into owner_id from public.shared_lists where id = household;
  if owner_id is null then
    raise exception 'That household no longer exists.';
  end if;
  if target_user is null or target_user = owner_id then
    raise exception 'The household owner role cannot be changed.';
  end if;
  if new_role is null or new_role not in ('admin', 'member', 'child') then
    raise exception 'Choose parent, member or child.';
  end if;
  if not exists (
    select 1 from public.shared_list_members
    where list_id = household and user_id = target_user
  ) then
    raise exception 'That person is no longer a member of this household.';
  end if;
  select role into target_role from public.household_member_roles
    where household_id = household and user_id = target_user;

  if owner_id <> auth.uid() then
    if not public.can_manage_household(household) then
      raise exception 'Only the household owner or a parent can change roles.';
    end if;
    if new_role = 'admin' or target_role = 'admin' then
      raise exception 'Only the household owner can change parent roles.';
    end if;
  end if;

  if new_role = 'member' then
    delete from public.household_member_roles
    where household_id = household and user_id = target_user;
  else
    insert into public.household_member_roles (household_id, user_id, role, granted_by, updated_at)
    values (household, target_user, new_role, auth.uid(), now())
    on conflict (household_id, user_id) do update
      set role = new_role, granted_by = auth.uid(), updated_at = now();
  end if;
  return true;
end;
$$;

revoke all on function public.set_household_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_household_member_role(uuid, uuid, text) to authenticated;

