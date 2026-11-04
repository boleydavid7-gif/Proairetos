-- Give the data-key envelope an explicit account-password slot.
-- Existing passphrase_wrap values remain intact for one-time legacy migration.
alter table public.user_keys
  add column if not exists password_wrap jsonb;

comment on column public.user_keys.password_wrap is
  'End-to-end encrypted data-key envelope derived from the Supabase account password. Never contains the password itself.';
