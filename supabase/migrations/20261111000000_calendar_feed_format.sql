-- Calendar feed, format 2 (the calendar privacy correction).
--
-- Files published before this held more than the person chose: bill amounts, booking confirmation codes and notes.
-- Every existing link is ended and its file removed, and from now on the server accepts and serves only files made by
-- the corrected version (format 2), so an older version of the app cannot write the old content back.
--
-- Run this AFTER the corrected app and the calendar-feed function are deployed (docs/CALENDAR_CORRECTIONS_PLAN.md,
-- "Deployment order"). Safe to run more than once: it only removes rows that are not format 2.
--
-- What it cannot undo: rows removed here are gone (there is no copy to restore, by design), and database backups or
-- point-in-time recovery may hold earlier rows until their retention ends. Calendar apps that already fetched a file
-- keep their own copy.

alter table public.calendar_feeds add column if not exists format smallint;

-- Ends every link made before this change. A person makes a new link in Settings, which gets a new random token.
delete from public.calendar_feeds where format is distinct from 2;

-- Writes need format 2. A client that does not send it (every older version) is refused.
drop policy if exists "own feed" on public.calendar_feeds;
create policy "own feed" on public.calendar_feeds
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and format = 2);
