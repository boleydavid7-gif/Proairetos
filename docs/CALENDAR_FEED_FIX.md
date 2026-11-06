# Calendar feed privacy fix (stand-alone) and its first deployment

Branch `claude/calendar-feed-privacy-fix`, based directly on `origin/main`. It carries only this correction. It does not include the provider, search, Home
or Calendar architecture of the session branch, and the three new category switches (bills, trips and time off, bookings and plans) are not in it.
Nothing here has been run in production.

## Where production stands (investigation, Nov 6)

- The app and Worker point at Supabase project `ccxkwfmybtouneurxunj`. That project has the app's tables from most migrations, but **not** `public.calendar_feeds`
  (migration `20261002000000_calendar_feed.sql`, added to `main` in commit `52a48d8b`, 2026-10-01). It also lacks the tables of `20261027000000_trip_inbox.sql` and
  `20261102000000_first_week_emails.sql` (not part of this work).
- The `calendar-feed` function is deployed (an older version). Its database query fails, so it answers "Try again later" (503) for a well-formed token.
- So the calendar link has never worked in production: the app cannot get as far as showing a link, no row was ever stored, and no calendar app ever fetched a file.
  Nothing has to be ended, rotated or deleted. This deployment is the **first** availability of calendar subscriptions.

## The problem this fixes

The published file would have contained, whatever the person switched on: every bill with its amount in the title, and Poreia's trips, time off, timed bookings and plans, with
`Confirmation <code>`, plan notes, time off titles and addresses as notes and places. The file is stored in plain text and served to anyone with the link. The settings page
said it held only "what you chose above". Because the feature never reached production, this never happened to anyone; the fix has to be live from the first day.

## What changed

Five commits, each reviewable alone.

1. **Server**: `supabase/migrations/20261111000000_calendar_feed_format.sql`, `supabase/functions/calendar-feed/index.ts`, `supabase/tests/calendar_feed_format.sh`,
   `src/tests/calendar/feedFunction.test.ts`. The migration adds `calendar_feeds.format`, makes writes need `format = 2`, and removes any row that is not format 2 (none exist on
   a project with no feeds). The function serves only format 2 and sends a no-referrer policy.
2. **App**:
   - `src/app/sync/calendarFile.ts`: the file is the schedule and things the person chose (`feedEvents`) and nothing else. Bills and Poreia are not read.
   - `src/app/calendars/poreiaCalendar.ts`: the feed reader is removed. Today and Days ahead are unchanged.
   - `src/data/sync/supabase.ts`: reads, writes and refreshes format 2 only.
   - `src/data/storage/preferences.ts`, `src/app/sync/syncController.ts`: a link that ended (no token, or nothing updated) sets `linkEnded`, cleared by a new link or turning off.
   - `src/core/calendar/feedEvents.ts`: `describeFeed` and `FEED_NEVER`.
   - `src/features/settings/CalendarSection.tsx`: lists what the switches on put in the file, what it never holds, that calendar apps keep what they fetched, and a status line after an ended link.
3. **Words**: `public/privacy.html`, `PrivacyGlance.tsx`, `docs/SERVER_SETUP.md`, `CLAUDE.md`, `src/app/whatsNew.ts`.
4. **Individual downloads**: a trip's "Add to your calendar" file holds no confirmation codes or notes, and a bill's holds no amount
   (`src/poreia/core/calendar.ts`, `src/oikonomia/core/calendar.ts`, their tests, `src/tests/calendar/downloadsPrivacy.test.ts`). Places and addresses stay in a trip's own file.
5. **Wording and dependency** (this commit and the one before it): the migration says it requires `20261002000000` (comments only, no statement changed), and the texts describe the
   link as new.

Unchanged: the four switches and their defaults, the 60-day window, the link form, sign-in and encryption. Not in this fix: the three new switches, and the recurring-bill correction.

File identities at this branch's last commit (check before running anything):

| File | SHA-256 |
| --- | --- |
| `supabase/migrations/20261002000000_calendar_feed.sql` (unchanged from `main`) | `6946911cbadc490b8e2c5d0804928cbf3875e238d5a104e2c9ab1034c0517185` |
| `supabase/migrations/20261111000000_calendar_feed_format.sql` | `168e959469e8715956cbce3d770654ed131581d76b88ae251355297218fb915e` |
| `supabase/functions/calendar-feed/index.ts` | `d27cc96adf6bd6b2fe30dc136db4f7ae979389f095f38527ba972d283a1ee728` |

The format migration's comments differ from the copy on the session branch; its statements do not. A later merge of the session branch will report a conflict in that one file, resolved by keeping this version.

## Deployment (first deployment of calendar subscriptions)

Each production step waits for the owner's explicit confirmation. None has been run.

**Dependencies.** `20261111000000` requires `20261002000000`. Run them together, in this order. Never run `20261002000000` alone: it has no format rule, so an app that
predates this fix could publish a file with more in it than the person chose. Do not use `supabase db push`: the project's migrations are applied by hand in the SQL editor, so the
CLI would try to apply all of them.

0. **Identity.** Confirm the dashboard address ends in project `ccxkwfmybtouneurxunj`. Check the file hashes above against a checkout of the branch.
   In the SQL editor run `select table_name from information_schema.tables where table_schema = 'public' order by 1;` Expect `records`, `user_keys` and the others, and no `calendar_feeds`.
   Note the backup retention shown under Database > Backups.
1. **Schema.** In one SQL-editor session, run `20261002000000_calendar_feed.sql`, then `20261111000000_calendar_feed_format.sql` (each pasted whole). Both are safe to run again. The second is one
   transaction. Afterwards: `calendar_feeds` exists, empty, with a `format` column, row-level security on, and a rule that only format 2 rows can be written.
   Check: `select column_name from information_schema.columns where table_name = 'calendar_feeds';` includes `format`; `select count(*) from public.calendar_feeds;` is 0.
2. **Function.** `supabase functions deploy calendar-feed --no-verify-jwt` (the flag is required: calendar apps cannot sign in). It replaces the deployed older copy; no new variables or secrets.
3. **App.** Merge this branch to `main`. Cloudflare builds and deploys from `main`; no new Worker variables or secrets, and no other function needs redeploying for this change.
   Do this only after step 1: the new app asks for the `format` column.
4. **Verify**, with a test account:
   - Settings > Calendar > Create link works and the page lists exactly the switches on, and what the file never holds.
   - The link answers 200 as a calendar file holding only those categories; open it and confirm no bill, trip, amount, code or note.
   - An unknown well-formed token answers 404, and a malformed token (`?token=short`) answers 404.
   - `select count(*) from public.calendar_feeds;` is 1 (the test account) and `select count(*) from public.calendar_feeds where format is distinct from 2;` is 0.
   - Turn the link off in the app; the count returns to 0.

**Order, with reasons.**
- Step 1 before step 2: the function filters on `format`, which does not exist until the schema is applied.
- Step 1 before step 3: the new app writes `format`.
- Both migrations in one session: between them the table exists with no format rule.
- With step 1 done and the app on `main` still the old one (before step 3), the database refuses its writes, so no old-format file can appear.

**Rollback.** There is nothing to preserve, so rollback is simple: the table can be dropped (it holds only test rows), the previous function can be redeployed, and the app can be rolled back.
Rolling the app back after step 1 leaves the older app unable to publish a link (its writes are refused), which is the same as today. Calendar apps that subscribed during the window keep what
they fetched; people remove the subscription there. The link carries the token, and the platform's request logs may record it; the app and the function log nothing of it.

**Not verified here:** the migrations and function on Supabase itself, a real calendar app subscribing, and the Worker build on `main` after the merge. Local checks (types, lint, calendar tests,
the migration against a scratch Postgres 16, the language guard, the production build and the Wrangler dry run) were run on earlier commits of this branch; rerun the cheap ones after this commit.
