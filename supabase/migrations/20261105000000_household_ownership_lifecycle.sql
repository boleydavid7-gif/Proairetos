-- Household ownership transfer and deletion.
--
-- Household metadata is stored in the shared_lists row. These security-definer functions keep ownership changes
-- server-authoritative and make deletion revoke household-derived app-list access without deleting app-list data.

create or replace function public.transfer_household_ownership(household uuid, new_owner uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;

  select l.created_by into current_owner
  from public.shared_lists l
  where l.id = household
  for update;

  if current_owner is null then
    raise exception 'That household no longer exists.';
  end if;
  if current_owner <> auth.uid() then
    raise exception 'Only the household owner can transfer ownership.';
  end if;
  if new_owner is null or new_owner = current_owner then
    raise exception 'Choose another household member.';
  end if;
  if not exists (
    select 1 from public.shared_list_members m
    where m.list_id = household and m.user_id = new_owner
  ) then
    raise exception 'The new owner must already be a member of this household.';
  end if;

  -- The recipient becomes owner by virtue of created_by. The former owner becomes an ordinary member.
  delete from public.household_member_roles
  where household_id = household and user_id in (current_owner, new_owner);

  update public.shared_lists
  set created_by = new_owner
  where id = household;

  return true;
end;
$$;

revoke all on function public.transfer_household_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_household_ownership(uuid, uuid) to authenticated;

create or replace function public.delete_household(household uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
  linked_list record;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;

  select l.created_by into current_owner
  from public.shared_lists l
  where l.id = household
  for update;

  if current_owner is null then
    raise exception 'That household no longer exists.';
  end if;
  if current_owner <> auth.uid() then
    raise exception 'Only the household owner can delete this household.';
  end if;

  -- Keep each linked app list and its content. Preserve access for its original creator and the person who
  -- established that app share; remove the other household members so deletion cannot leave family access behind.
  for linked_list in
    select s.shared_list_id, s.owner_id, app_list.created_by
    from public.household_app_shares s
    join public.shared_lists app_list on app_list.id = s.shared_list_id
    where s.household_id = household
  loop
    delete from public.shared_list_members m
    where m.list_id = linked_list.shared_list_id
      -- All other members came through this household. Remove former members too, so deletion cannot restore
      -- access to people who left or were removed before the household itself was deleted.
      and m.user_id is distinct from linked_list.created_by
      and m.user_id is distinct from linked_list.owner_id
      and m.user_id is distinct from current_owner;
  end loop;

  -- Remove access rules before the household-member cascade runs its ordinary leave cleanup trigger.
  delete from public.household_app_shares where household_id = household;

  -- Cascades the household's own members, encrypted index, invitations and roles.
  delete from public.shared_lists where id = household;
  return true;
end;
$$;

revoke all on function public.delete_household(uuid) from public, anon;
grant execute on function public.delete_household(uuid) to authenticated;


-- Leaving or being removed from a household must revoke membership in its connected app lists too.
-- This is important for both immediate revocation and later household deletion: a former member must not
-- regain access merely because the household's app-share row is eventually removed.
create or replace function public.cleanup_household_member_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_list record;
begin
  delete from public.household_member_roles
  where household_id = old.list_id and user_id = old.user_id;
  delete from public.household_invites
  where household_id = old.list_id and (from_user = old.user_id or to_user = old.user_id);

  for linked_list in
    select s.shared_list_id, app_list.created_by
    from public.household_app_shares s
    join public.shared_lists app_list on app_list.id = s.shared_list_id
    where s.household_id = old.list_id
  loop
    delete from public.shared_list_members
    where list_id = linked_list.shared_list_id
      and user_id = old.user_id
      and user_id is distinct from linked_list.created_by;
  end loop;
  return old;
end;
$$;

revoke all on function public.cleanup_household_member_role() from public, anon, authenticated;
