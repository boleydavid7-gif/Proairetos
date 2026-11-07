-- Proairetos sync schema.
--
-- Everything a person writes is encrypted on their device before it gets
-- here. These tables hold sealed records, the person's wrapped key, push
-- subscriptions, and reminder times (times only, no content).
-- Row-level security limits every row to the signed-in person.

-- ---------- Sealed records ----------

create sequence if not exists public.records_seq;

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in (
    'lifeItems', 'itemEvents', 'reflections', 'values', 'statements',
    'schedulePatterns', 'scheduleExceptions', 'decisions'
  )),
  id text not null check (char_length(id) between 1 and 200),
  iv text,
  ciphertext text check (ciphertext is null or char_length(ciphertext) <= 1000000),
  deleted boolean not null default false,
  -- Every write gets a new sequence number; devices pull "everything after N".
  seq bigint not null default nextval('public.records_seq'),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id),
  check (deleted or (iv is not null and ciphertext is not null))
);

create index if not exists records_user_seq on public.records (user_id, seq);

create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  new.seq := nextval('public.records_seq');
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.records_touch();

alter table public.records enable row level security;

drop policy if exists "own records" on public.records;
create policy "own records" on public.records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Wrapped data key ----------
-- The data key, encrypted with the person's passphrase and with their
-- recovery key. Neither the passphrase nor the recovery key is stored.

create table if not exists public.user_keys (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  passphrase_wrap jsonb not null,
  recovery_wrap jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_keys enable row level security;

drop policy if exists "own key" on public.user_keys;
create policy "own key" on public.user_keys
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Push subscriptions ----------

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Reminder times ----------
-- Only when to send a reminder. The id is an opaque hash; nothing here says
-- what the reminder is about.

create table if not exists public.reminders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 100),
  fire_at timestamptz not null,
  sent_at timestamptz,
  primary key (user_id, id)
);

create index if not exists reminders_due on public.reminders (fire_at) where sent_at is null;

alter table public.reminders enable row level security;

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
