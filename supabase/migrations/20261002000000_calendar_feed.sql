-- Calendar subscription feed (optional).
--
-- The one place the server holds readable data, and only by the person's
-- choice: a calendar file they asked to publish so Apple, Google, or
-- Microsoft calendars can subscribe to it. It holds only what they picked
-- (by default, commitment times titled "Busy"). Everything else stays end-to-end
-- encrypted in `records`.
--
-- Safe to run more than once.

create table if not exists public.calendar_feeds (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Long random secret in the link; anyone holding the link can read the feed.
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{32,100}$'),
  ics text not null check (octet_length(ics) <= 1000000),
  updated_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

drop policy if exists "own feed" on public.calendar_feeds;
create policy "own feed" on public.calendar_feeds
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
