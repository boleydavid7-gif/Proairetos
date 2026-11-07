-- Passkeys: sign in and open the data with Face ID, a fingerprint or the device's PIN, in any app of the family.
--
-- A person, signed in and unlocked, adds a passkey. Kept here: its public key (to check its signature when it signs
-- in, in the `passkey-sign-in` function) and the data key sealed with a secret only that passkey can give on the
-- device (WebAuthn PRF). The server can check a signature; it cannot open the data key.

create table if not exists public.passkeys (
  credential_id text primary key check (char_length(credential_id) <= 1400),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  public_key text not null check (char_length(public_key) <= 2000),
  algorithm integer not null check (algorithm in (-7, -257)),
  rp_id text not null check (char_length(rp_id) <= 253),
  wrap jsonb,
  label text check (char_length(label) <= 100),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists passkeys_user on public.passkeys (user_id);

alter table public.passkeys enable row level security;

drop policy if exists "own passkeys" on public.passkeys;
create policy "own passkeys" on public.passkeys
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- One-time challenges for signing in, made and taken by the function only (no policies: nobody else reaches them).
create table if not exists public.passkey_challenges (
  challenge text primary key check (char_length(challenge) <= 100),
  expires_at timestamptz not null default now() + interval '2 minutes'
);

alter table public.passkey_challenges enable row level security;
