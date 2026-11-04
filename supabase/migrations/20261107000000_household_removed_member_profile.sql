-- Remove a member's encrypted household profile row atomically with membership revocation.
--
-- Household profile names/emails are stored as encrypted shared_list_items rows with a stable
-- id of "member:<auth user id>". Deleting shared_list_members alone revokes access but does not
-- remove that profile row, so the owner can continue seeing a stale name/email indefinitely.
-- Keep the existing authorization checks and delete the encrypted index row in the same RPC.

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

  -- Remove the encrypted display profile so the household owner no longer sees a stale member.
  delete from public.shared_list_items
  where list_id = household and id = 'member:' || target_user::text;

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
