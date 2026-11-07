-- The waitlist on the front page: people who want to hear when the family opens, and which apps they are curious
-- about. Only the Worker writes (through join_waitlist, with the publishable key); nobody can read the list through
-- the API. The owner reads it in the SQL editor:  select email, apps, created_at from public.waitlist order by created_at;

create table if not exists public.waitlist (
  email text primary key check (length(email) between 3 and 254 and position('@' in email) > 1),
  apps text[] not null default '{}',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
-- No policies: the table is closed to the API; join_waitlist below is the only way in.

-- Adds an email, or adds apps to one already there. Returns true when kept.
create or replace function public.join_waitlist(email text, apps text[] default '{}', source text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := lower(trim(email));
  wanted text[] := coalesce(apps, '{}');
begin
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(clean) > 254 or cardinality(wanted) > 20 then
    return false;
  end if;
  if (select count(*) from public.waitlist) >= 100000 then
    return false;
  end if;
  insert into public.waitlist as w (email, apps, source)
  values (clean, wanted, left(source, 40))
  on conflict on constraint waitlist_pkey do update
    set apps = (select coalesce(array_agg(distinct a order by a), '{}') from unnest(w.apps || excluded.apps) as a),
        updated_at = now();
  return true;
end;
$$;

revoke all on function public.join_waitlist(text, text[], text) from public;
grant execute on function public.join_waitlist(text, text[], text) to anon;
