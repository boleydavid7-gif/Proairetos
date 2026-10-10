-- Reminders from every app in the family.
--
-- Each app keeps its own reminder rows (`source`: proairetos, askesis, oikonomia,
-- hydros, praxis), so one app refreshing its times never removes another's.
-- `sealed` carries the words, encrypted on the device with the account key; the
-- server passes it along in the push without being able to read it. Proairetos's
-- service worker opens it, so a reminder written by HYDROS shows its own words
-- on a phone where only Proairetos receives pushes.

alter table public.reminders add column if not exists source text not null default 'proairetos'
  check (char_length(source) <= 20);
alter table public.reminders add column if not exists sealed text
  check (sealed is null or char_length(sealed) <= 1200);

create index if not exists reminders_source on public.reminders (user_id, source) where sent_at is null;
