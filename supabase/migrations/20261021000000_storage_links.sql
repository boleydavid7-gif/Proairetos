-- Bring your own storage: which storage the person's sealed records sync through (Google Drive, Dropbox, OneDrive),
-- and the refresh token for it, sealed on the device with the account key. The server cannot open the token; it
-- keeps it so every app and every device of the person follows the same choice.

create table if not exists public.storage_links (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'dropbox', 'onedrive')),
  sealed jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.storage_links enable row level security;

drop policy if exists "own storage link" on public.storage_links;
create policy "own storage link" on public.storage_links
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
