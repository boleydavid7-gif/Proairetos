-- The newsletter, asked apart from the waitlist: a person on the list gets the newsletter only when they ticked its own
-- box. `letters` records that choice and when it was made; a later visit without the box never takes it away (only the
-- owner does, by request: update public.waitlist set letters = false, letters_at = null where email = '…';).
-- Read who said yes:  select email, letters_at from public.waitlist where letters order by letters_at;

alter table public.waitlist add column if not exists letters boolean not null default false;
alter table public.waitlist add column if not exists letters_at timestamptz;

-- One signature only, so the API never has two to choose between; the Worker still works before this runs.
drop function if exists public.join_waitlist(text, text[], text);

create or replace function public.join_waitlist(email text, apps text[] default '{}', source text default null, letters boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := lower(trim(email));
  wanted text[] := coalesce(apps, '{}');
  yes boolean := coalesce(letters, false);
begin
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(clean) > 254 or cardinality(wanted) > 20 then
    return false;
  end if;
  if (select count(*) from public.waitlist) >= 100000 then
    return false;
  end if;
  insert into public.waitlist as w (email, apps, source, letters, letters_at)
  values (clean, wanted, left(source, 40), yes, case when yes then now() end)
  on conflict on constraint waitlist_pkey do update
    set apps = (select coalesce(array_agg(distinct a order by a), '{}') from unnest(w.apps || excluded.apps) as a),
        letters = w.letters or excluded.letters,
        letters_at = case when w.letters then w.letters_at else excluded.letters_at end,
        updated_at = now();
  return true;
end;
$$;

revoke all on function public.join_waitlist(text, text[], text, boolean) from public;
grant execute on function public.join_waitlist(text, text[], text, boolean) to anon;
