-- Sign in another app from Proairetos (each iPhone Home Screen app keeps its own storage).
--
-- Proairetos, signed in and unlocked, makes a one-time pass: a fresh sign-in for the same account (from the
-- `sign-in-handoff` function) and the data key sealed with a random key. That random key waits here, for two
-- minutes at most, and is taken once by the app the pass is pasted into, after it has signed in as the same
-- person. The server never sees the data key itself.

create table if not exists public.sign_in_handoffs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  wrap_key text not null check (char_length(wrap_key) <= 100),
  expires_at timestamptz not null default now() + interval '2 minutes'
);

alter table public.sign_in_handoffs enable row level security;

drop policy if exists "people leave their own handoffs" on public.sign_in_handoffs;
create policy "people leave their own handoffs" on public.sign_in_handoffs
  for insert to authenticated with check (user_id = auth.uid());

-- Taking a handoff returns its key once, only to the same person, only before it expires; it is then gone.
create or replace function public.take_handoff(handoff uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found text;
begin
  delete from public.sign_in_handoffs where expires_at < now();
  if auth.uid() is null then
    return null;
  end if;
  delete from public.sign_in_handoffs
    where id = handoff and user_id = auth.uid() and expires_at >= now()
    returning wrap_key into found;
  return found;
end;
$$;

revoke all on function public.take_handoff(uuid) from public;
grant execute on function public.take_handoff(uuid) to authenticated;
