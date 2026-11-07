-- Keep connected app-list membership in sync with household membership.
--
-- A person who enabled a share remains the owner of that sharing connection. When they leave the household,
-- they must retain access to the app list they connected, just as its original creator does. Everyone else who
-- leaves or is removed loses membership in the connected app list. The next device sync then clears its stale
-- local reference and cache; data already downloaded to an offline device cannot be recalled.

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
    select s.shared_list_id, app_list.created_by, s.owner_id
    from public.household_app_shares s
    join public.shared_lists app_list on app_list.id = s.shared_list_id
    where s.household_id = old.list_id
  loop
    delete from public.shared_list_members
    where list_id = linked_list.shared_list_id
      and user_id = old.user_id
      and user_id is distinct from linked_list.created_by
      and user_id is distinct from linked_list.owner_id;
  end loop;

  return old;
end;
$$;

revoke all on function public.cleanup_household_member_role() from public, anon, authenticated;
