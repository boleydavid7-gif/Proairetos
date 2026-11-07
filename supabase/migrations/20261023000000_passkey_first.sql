-- An account can be set up with a passkey alone: the data key is wrapped by the passkey (in passkeys.wrap) and by
-- the recovery key, with no passphrase. A passphrase can still be added later from Account.
alter table public.user_keys alter column passphrase_wrap drop not null;
