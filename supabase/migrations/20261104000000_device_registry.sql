-- Device registry for account security. Contains device metadata only; never store
-- passwords, refresh tokens, encryption keys, or private record contents here.
create table if not exists public.account_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_key text not null check (char_length(device_key) between 16 and 128),
  label text not null default 'Device' check (char_length(label) between 1 and 80),
  platform text not null default 'web' check (platform in ('web','ios','android','windows','macos','linux','other')),
  app_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_key)
);

create index if not exists account_devices_user_last_seen
  on public.account_devices(user_id, last_seen_at desc);

alter table public.account_devices enable row level security;

drop policy if exists "own account devices" on public.account_devices;
create policy "own account devices" on public.account_devices
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A device may update only its own registration row. The client cannot assign
-- another user_id because RLS and the default both bind it to auth.uid().
