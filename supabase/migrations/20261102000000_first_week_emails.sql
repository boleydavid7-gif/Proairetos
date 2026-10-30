-- The first-week emails (worker/firstWeek.ts): which of the three each account has had, and who asked for no more.
-- Only the Worker reads and writes these, with the service role; nobody can through the API.
-- See who stopped them:  select user_id, stopped_at from public.email_stops order by stopped_at desc;

create table if not exists public.first_week_emails (
  user_id uuid not null references auth.users (id) on delete cascade,
  step text not null check (step in ('start', 'week', 'ending')),
  sent_at timestamptz not null default now(),
  primary key (user_id, step)
);

create table if not exists public.email_stops (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stopped_at timestamptz not null default now()
);

alter table public.first_week_emails enable row level security;
alter table public.email_stops enable row level security;
-- No policies: closed to the API; the service role passes row security.
