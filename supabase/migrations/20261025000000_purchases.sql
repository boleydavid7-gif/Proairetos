-- The Store: add-ons bought once ($4.99 each) through Stripe Checkout. One row per person and app, written only by
-- the Worker's Stripe webhook (with the service role, which passes row-level security); each person reads their own.
create table if not exists public.purchases (
  user_id uuid not null references auth.users (id) on delete cascade,
  app text not null,
  session_id text not null unique,
  amount integer,
  currency text,
  created_at timestamptz not null default now(),
  primary key (user_id, app)
);

alter table public.purchases enable row level security;

drop policy if exists "own purchases" on public.purchases;
create policy "own purchases" on public.purchases for select using (auth.uid() = user_id);
