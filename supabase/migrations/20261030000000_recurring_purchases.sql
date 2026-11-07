-- Store subscriptions. A row is an entitlement for one plan/app and is updated by Stripe subscription webhooks.
alter table public.purchases add column if not exists active boolean not null default true;
alter table public.purchases add column if not exists subscription_id text;
alter table public.purchases add column if not exists current_period_end timestamptz;
alter table public.purchases add column if not exists updated_at timestamptz not null default now();

create index if not exists purchases_subscription_id_idx on public.purchases (subscription_id);
create index if not exists purchases_active_idx on public.purchases (user_id, active);
