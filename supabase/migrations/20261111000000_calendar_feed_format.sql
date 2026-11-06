-- Calendar feed, format 2 (the calendar privacy correction).
--
-- REQUIRES 20261002000000_calendar_feed.sql, which creates public.calendar_feeds and its row-level security. Run that
-- file first, in the same session. On a project where that table does not exist this file fails on its first statement
-- (42P01) and, being one transaction, changes nothing. Never run 20261002000000 on its own: it has no format rule, so
-- an app that predates this correction could publish a calendar file with more in it than the person chose.
--
-- What this adds: a `format` column, and a write rule that accepts only format 2, so the server holds and serves only
-- files made by the corrected app. It also removes any row that is not format 2. On a project where the calendar link
-- was never set up there is none, and that delete changes nothing.
--
-- Run it before the calendar-feed function and the corrected app are released (docs/CALENDAR_FEED_FIX.md, "Deployment").
-- It is one transaction: it all happens or none of it does. Safe to run more than once.
--
-- What it cannot undo: rows removed here are gone (there is no copy to restore, by design), and database backups or
-- point-in-time recovery may hold earlier rows until their retention ends.

begin;

alter table public.calendar_feeds add column if not exists format smallint;

-- First: writes need format 2. A client that does not send it (every older version) is refused from this point, so no
-- old-format row can appear after the rows are removed below.
drop policy if exists "own feed" on public.calendar_feeds;
create policy "own feed" on public.calendar_feeds
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and format = 2);

-- Then: end every link made before this change. A person makes a new link in Settings, which gets a new random token.
delete from public.calendar_feeds where format is distinct from 2;

commit;
