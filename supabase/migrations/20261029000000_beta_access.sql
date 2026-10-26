-- Temporary beta access, managed only by the Worker owner endpoint.
create table if not exists public.beta_access (
  email text primary key check (length(email) between 3 and 254 and position('@' in email) > 1),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.beta_access enable row level security;
-- No policies: only the Worker's service role reads and writes this table.
