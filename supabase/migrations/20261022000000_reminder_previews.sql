-- Optional notification previews for a person who chose to show reminder details.
-- The sealed words remain the source of truth for the service worker; these fields only
-- let a declarative iPhone push carry the same choice when the worker cannot wake.
alter table public.reminders add column if not exists preview_title text
  check (preview_title is null or char_length(preview_title) <= 120);
alter table public.reminders add column if not exists preview_body text
  check (preview_body is null or char_length(preview_body) <= 300);
alter table public.reminders add column if not exists preview_open text
  check (preview_open is null or char_length(preview_open) <= 160);
