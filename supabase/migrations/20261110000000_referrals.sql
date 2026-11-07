-- Sharing Proairetos: the person who shared earns 20% off their Core plan for six months, once, when someone they
-- shared with subscribes. Written only by the Worker (service role) from Stripe's paid checkout; a person reads their own.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null unique references auth.users (id) on delete cascade,
  referee_id uuid not null unique references auth.users (id) on delete cascade,
  session_id text not null,
  applied boolean not null default false,
  created_at timestamptz not null default now(),
  check (referrer_id <> referee_id)
);

alter table public.referrals enable row level security;

drop policy if exists "read own referral" on public.referrals;
create policy "read own referral" on public.referrals for select using (referrer_id = auth.uid());
-- No insert, update or delete policy: only the service role writes.
