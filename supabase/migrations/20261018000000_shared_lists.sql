-- Shared lists (SOMA's grocery list, shared with someone).
--
-- A list's items are sealed on the phone with the list's own key. The key travels only in the invite link,
-- after the `#`, which browsers never send to a server, so the server holds sealed items it cannot read.
-- Members are people on this server who opened the link while signed in; joining proves they hold the key
-- (`join_proof` is a hash of it), so knowing a list's id alone is not enough.

create table if not exists public.shared_lists (
  id uuid primary key,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  join_proof text not null check (char_length(join_proof) <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.shared_list_members (
  list_id uuid not null references public.shared_lists (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists public.shared_list_items (
  list_id uuid not null references public.shared_lists (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  sealed text not null check (char_length(sealed) <= 4000),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (list_id, id)
);

alter table public.shared_lists enable row level security;
alter table public.shared_list_members enable row level security;
alter table public.shared_list_items enable row level security;

-- Whether the person asking belongs to a list (security definer, so policies can ask it without recursion).
create or replace function public.is_list_member(list uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.shared_list_members where list_id = list and user_id = auth.uid());
$$;

drop policy if exists "members see their lists" on public.shared_lists;
create policy "members see their lists" on public.shared_lists
  for select to authenticated using (created_by = auth.uid() or public.is_list_member(id));
drop policy if exists "people make their own lists" on public.shared_lists;
create policy "people make their own lists" on public.shared_lists
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "the maker can remove a list" on public.shared_lists;
create policy "the maker can remove a list" on public.shared_lists
  for delete to authenticated using (created_by = auth.uid());

drop policy if exists "members see who else is on a list" on public.shared_list_members;
create policy "members see who else is on a list" on public.shared_list_members
  for select to authenticated using (public.is_list_member(list_id));
drop policy if exists "the maker joins their own list" on public.shared_list_members;
create policy "the maker joins their own list" on public.shared_list_members
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.shared_lists where id = list_id and created_by = auth.uid())
  );
drop policy if exists "anyone can leave" on public.shared_list_members;
create policy "anyone can leave" on public.shared_list_members
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "members read and write items" on public.shared_list_items;
create policy "members read and write items" on public.shared_list_items
  for all to authenticated using (public.is_list_member(list_id)) with check (public.is_list_member(list_id));

-- Joining from an invite: the proof must match the list's, then the person is added.
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
  insert into public.shared_list_members (list_id, user_id) values (list, auth.uid()) on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.join_shared_list(uuid, text) from public;
grant execute on function public.join_shared_list(uuid, text) to authenticated;
revoke all on function public.is_list_member(uuid) from public;
grant execute on function public.is_list_member(uuid) to authenticated;

create index if not exists shared_list_items_changed on public.shared_list_items (list_id, updated_at);
