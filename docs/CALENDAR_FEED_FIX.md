# Calendar feed privacy fix (stand-alone)

Branch `claude/calendar-feed-privacy-fix`, based directly on `origin/main`. It carries only this correction. It does not include the provider, search, Home
or Calendar architecture of the session branch, and the three new category switches (bills, trips and time off, bookings and plans) are not in it.
Nothing here has been run: no tests, no build, no production operation.

## The problem

`buildCalendarFile` added two sets of events to the published file whatever the person had switched on: every bill with its amount in the title, and Poreia's trips,
time off, timed bookings and plans, with `Confirmation <code>`, plan notes, time off titles and addresses as notes and places. The file is stored in plain text and
served to anyone with the link. The settings page said the file held only "what you chose above".

## What changed

Three commits, each reviewable alone.

1. **Server** (`882e4795`): `supabase/migrations/20261111000000_calendar_feed_format.sql`, `supabase/functions/calendar-feed/index.ts`,
   `supabase/tests/calendar_feed_format.sh`, `src/tests/calendar/feedFunction.test.ts`. These four files are byte-identical to the session branch
   (migration SHA-256 `9cbfcdde...7fadb`, function SHA-256 `d27cc96a...1ee728`), so a later merge of the full branch has nothing to resolve in them.
2. **App** (`196c3b70`):
   - `src/app/sync/calendarFile.ts`: the file is the schedule and things the person chose (`feedEvents`) and nothing else. Bills and Poreia are not read.
   - `src/app/calendars/poreiaCalendar.ts`: the feed reader (`feedEvents`) is removed. Today and Days ahead are unchanged.
   - `src/data/sync/supabase.ts`: reads, writes and refreshes format 2 only.
   - `src/data/storage/preferences.ts`, `src/app/sync/syncController.ts`: a link that ended (no token, or nothing updated) sets `linkEnded`, cleared by a new link or turning off.
   - `src/core/calendar/feedEvents.ts`: `describeFeed` and `FEED_NEVER`, the words the page uses.
   - `src/features/settings/CalendarSection.tsx`: the description lists exactly what the switches on put in the file, says what it never holds, says calendar apps keep what they
     fetched, and shows a status line after an ended link.
   - Tests: `feedContent`, `feedPrivacy`, `calendarSection` (all in `src/tests/calendar/`).
3. **Docs and words**: `public/privacy.html`, `PrivacyGlance.tsx`, `docs/SERVER_SETUP.md`, `CLAUDE.md`, `src/app/whatsNew.ts`, this file.

Unchanged: the four switches and their defaults (commitments on; names, protected time and things with a day or time off), the 60-day window, the link form, sign-in and encryption.

## Not in this fix

- The three new switches. Until the full release, bills and trips are simply not in the file.
- A trip's own "Add to your calendar" file (it holds confirmation codes and notes) and the bill page's "Add to your calendar" file (it holds the amount). Both are started by the person and go
  to their own calendar app. The approved correction for them is in the session branch (`poreia/core/calendar.ts`, `oikonomia/core/calendar.ts`); it can be added here as a separate small commit if wanted.
- The recurring-bill correction (`core/bills.ts`).

## Deployment

Order (each production step waits for explicit confirmation): record counts, run the migration, deploy the function, merge this branch to `main`, check old, new and malformed tokens,
re-check counts. Full checklist, windows and rollback limits: `docs/CALENDAR_DEPLOYMENT_CHECKLIST.md` on the session branch; the facts there apply unchanged (same migration, same function,
no new Worker variables or secrets; Cloudflare builds from `main`).
Because this branch has no conflicts with `main` and does not touch `send-reminders`, no other function needs redeploying for it.
