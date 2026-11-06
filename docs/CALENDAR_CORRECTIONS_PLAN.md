# Calendar corrections: two plans

Status: plans only. Nothing here is implemented. Each plan is its own change, with its own commits, and the two are not mixed.
Both stay on the session branch; nothing goes to main.

1. The published calendar feed: what it exports, and how to correct it.
2. Recurring bills: the 500-occurrence limit in `core/bills.ts`.

---

## 1. The published calendar feed

### 1.1 What exists today

**Where it lives**

| Part | File |
| --- | --- |
| Settings page (four switches, link, renew, turn off) | `src/features/settings/CalendarSection.tsx` |
| What the file holds | `src/app/sync/calendarFile.ts` `buildCalendarFile` |
| The person's choices (device only, left out of backups and sync) | `src/data/storage/preferences.ts` `loadCalendarFeed`, key `proairetos.calendarFeed` |
| Publish, refresh, renew, delete | `src/app/sync/syncController.ts` ("Calendar subscription"), `src/data/sync/supabase.ts` |
| Table | `supabase/migrations/20261002000000_calendar_feed.sql`, `public.calendar_feeds` |
| Serving | `supabase/functions/calendar-feed/index.ts` (deployed with `--no-verify-jwt`) |

**What the person chooses.** Four switches: commitments from the schedule (on by default), their own names for them, protected time,
things with a day or time. The page says the server and anyone with the link can read "what you chose above".

**What the file actually holds.** `buildCalendarFile` always adds two more sets of events, whatever the switches say:

- every Oikonomia bill's due dates, titled `Name · $amount` (`billCalendarEvents`, `oikonomia/core/calendar.ts`);
- Poreia's events from `poreiaEvents` through `app/calendars/poreiaFeed.ts`: trips and time off as all-day spans (time off carries
  its title as a note), timed bookings (with the booking's place or route, and `Confirmation <code>` as a note) and timed plans
  (with their note and place).

So a person who turns the link on to share busy times also publishes bill amounts, confirmation codes and notes, in plain text,
readable by anyone with the link. This is older than the calendar providers; Slice 4 only moved the Poreia reader into `poreiaFeed.ts`
without changing it. The settings page and `public/privacy.html` ("the calendar file you chose to share is the one thing the server
can read") do not match the file.

**How often it is written.** After every sync on a device that has the feed on (`refreshCalendarFeed`), on each switch change, on
Create link and on Make a new link. The file covers 7 days back and 60 ahead. It is stored whole in `calendar_feeds.ics` (at most
1 MB), one row per user.

**Access.** The link is `<project>/functions/v1/calendar-feed?token=<token>`. The token is 32 random bytes, base64url (43
characters). The function checks its shape, looks the row up with the service role and answers any `GET` or `HEAD` that has the
token. There is no sign-in, by design (calendar apps cannot sign in). Row-level security lets only the owner read, write or delete
their own row. A response carries `cache-control: private, max-age=900` and `x-robots-tag: noindex`. Make a new link replaces the
token; Turn off deletes the row.

**Downloaded file.** "Save a calendar file" (`downloadCalendarFile`) uses the same builder, so the saved file has the same extra events.

### 1.2 Existing tokens and cached copies

What can be known from the code, and what only the owner can check:

- **Active tokens.** Every row in `calendar_feeds` is an active token. This session has no access to the production database, so the count is
  unknown. The owner can run these read-only counts (they return numbers, not content):
  `select count(*) as feeds, count(*) filter (where ics like '%Confirmation %') as with_codes, count(*) filter (where ics ~ '\$[0-9]') as with_amounts from public.calendar_feeds;`
- **Server copies.** The `ics` column holds the last file in plain text. Database backups and point-in-time recovery may keep older
  rows until their retention ends; deleting rows does not purge those.
- **Calendar apps' copies.** Apple, Google and Outlook fetch the link and keep their own copy of the events. Google fetches from its
  own servers. No call from Proairetos can remove those copies. Killing the link stops further updates; the person has to remove the
  subscription in the calendar app to drop what it already has.
- **HTTP caches.** Responses are `private`, 15 minutes at most. Nothing long-lived.
- **Logs.** The token is in the query string, so request logs at the platform edge may hold it. A token that is rotated is no longer
  usable, which is the answer to that.
- **This device and others.** The app keeps no copy of the published file; only "Save a calendar file" writes one, to where the
  person chooses.

### 1.3 The correction

**Rule.** The file holds only what the person switched on, in categories the page names, and never holds a bill amount, a confirmation code
or a booking note.

**Categories** (stored in the same device setting; unknown keys read as off):

| Switch | Holds | Never holds |
| --- | --- | --- |
| Commitments from my schedule (existing) | "Busy" blocks, or their names with the second switch | |
| Use the names from my schedule (existing) | The schedule's own names | |
| Protected time (existing) | "Protected time" blocks | |
| Things with a day or time (existing) | To-do titles with their day or time | |
| Bills (new) | Bill name and each due date | amount, currency, payments, notes, bill types, paid state |
| Trips and time off (new) | Trip name and place name as all-day spans; "Time off" as an all-day span | time off titles, notes |
| Bookings and plans with a time (new) | Title and time | confirmation codes, providers, addresses, routes, notes |

All three new switches start off. A person who relied on bills or Poreia being in the feed turns them on; the file changes to
match when they do.

**How the file is built.** From the calendar providers' lines (`calendarStore.lines(range)`) for the Bills, Trips and Bookings categories,
so the manifest's exclusions apply to the feed as they do to Days ahead, and the feed cannot carry what a line cannot carry. A new
`feedLines(lines, options)` next to `feedEvents` in `core/calendar/` maps lines to events (uid from the line's ref and day, no
description field, no location except a trip's place name). `billCalendarEvents` stops being used by the feed, and `poreiaFeed.ts` is
removed. Timed lines and all-day spans keep their present ICS form (end-exclusive dates).

**Settings page.** The description is built from the switches, so it states exactly what the file holds:
"The file is not encrypted. It holds: busy times (titled “Busy”), bill names and due dates. It never holds bill amounts, confirmation
codes or notes." (The list changes with the switches.) The old line about "what you chose above" is removed. `PrivacyGlance.tsx`,
`public/privacy.html`, `docs/SERVER_SETUP.md` and `CLAUDE.md` are updated to the same facts.

**Choices that stay as they are.** Options remain per device (device-only setting, not synced), as today. The window, the link form
and the 15 minute cache stay.

### 1.4 Token rotation and migration

**Strategy: every existing link ends, and people create a new one.**

Migration `supabase/migrations/<date>_calendar_feed_format.sql` (safe to run more than once):

1. `alter table public.calendar_feeds add column if not exists format smallint;`
2. `delete from public.calendar_feeds;` which removes every old token and every old plain-text file at once.
3. Replace the `own feed` policy so that writes need `format = 2`: `with check (user_id = auth.uid() and format = 2)`. A client that
   still has the old builder cannot write a file at all, so it cannot put the old content back.

`calendar-feed` serves only rows with `format = 2` (defense in depth). The client writes `format: 2` on publish and refresh.

**Order**

1. Ship the new client (builder, switches, page text, `format: 2`).
2. Deploy `calendar-feed` (the `format` filter).
3. Run the migration. Do not run it first: until step 1 reaches a device, that device's old builder would write a file the new rule refuses.
4. Optional: the owner reads the three counts in 1.2 before and after.

**What people see.** A device with the feed on finds no token at its next sync; `refreshCalendarFeed` already turns the feed off in
that case. The page gets one status line, "Your calendar link was turned off. Create a new link to subscribe again.", until a new
link is made. A new link is a new random token; the person adds it to their calendar app and removes the old subscription there.
`WhatsNew` gets one dated line. Old PWAs that have not updated get a refused write if they try to publish; they show the existing
error line and pick up the new version through the service worker.

**Alternatives not chosen.** Keeping tokens and blanking the files would leave a link that may already be shared; deleting rows
is the one step that also ends the link. Rotating tokens client-side on next sync would depend on every device updating first.

**Encryption elsewhere.** Nothing else changes. The feed table is the only readable table; `records` and every other sealed
collection, the keys, sign-in and sync are not touched, and no migration step reads or writes them.

### 1.5 Files affected

- `src/app/sync/calendarFile.ts`, `src/core/calendar/feedEvents.ts` (`feedLines`), `src/core/calendar/ics.ts` (only if a field needs trimming)
- `src/app/sync/syncController.ts` (feed section: `format`, link-ended flag), `src/data/sync/supabase.ts`
- `src/data/storage/preferences.ts` (`StoredFeedOptions`: `bills`, `trips`, `tripTimes`; `linkEnded`)
- `src/features/settings/CalendarSection.tsx` (switches, generated description, status line)
- `supabase/migrations/<date>_calendar_feed_format.sql`, `supabase/functions/calendar-feed/index.ts`
- Removed from the feed path: `src/app/calendars/poreiaFeed.ts`; `billCalendarEvents` stays only for Oikonomia's own download
- `src/features/settings/PrivacyGlance.tsx`, `public/privacy.html`, `docs/SERVER_SETUP.md`, `CLAUDE.md`, `src/app/whatsNew.ts`
- Tests: `src/tests/calendar/` (feed builder), `src/tests/providers/calendarFeed.test.ts` (rewritten: it now asserts the old content)

### 1.6 Decisions needed

1. **Defaults.** New switches off, existing defaults unchanged (commitments on). Confirm.
2. **Place names.** Include a trip's place name and nothing else geographic; leave out booking addresses, routes and plan places. Confirm, or say what to include.
3. **Other exports.** Two person-started files also carry sensitive text and are outside this plan unless you say so: a trip's "Add to your calendar" file (`tripEvents`, includes confirmation codes) and the bill page's "Add to your calendar" file (`downloadBillCalendar`, includes amounts). Both go to the person's own calendar app. Change them too, or leave as they are?
4. **Migration.** Delete all rows and require new links (recommended), or keep links and blank the files.

### 1.7 Recommended tests (to run only when you authorize)

| Test | Why | Estimated time |
| --- | --- | --- |
| Feed builder unit tests with canary values in every excluded field, for each switch alone and all together | Nothing excluded reaches any line of the file | under 10 s |
| Settings text test: the description lists exactly the switched-on categories | The page describes the file | under 10 s |
| Option migration test: stored options without the new keys read as off | Existing devices keep their choices | under 5 s |
| Migration run against a local Postgres 16: rows removed, a write without `format = 2` refused, one with it accepted, another user's row untouched | Rotation and the write guard | about 2 minutes |
| One request each to the function with an old token (404), a new token (200), a malformed token (404) | The link behaves as described | about 1 minute, manual |
| `tsc`, lint, language guard | Compile and wording | under 15 s |

Deferrable: sync, search, Home and together suites (unchanged); encryption tests (nothing sealed changes). Before deployment this
needs your sign-off on the migration order and on the counts in 1.2.

---

## 2. Recurring bills: the 500-occurrence limit

### 2.1 The defect

In `src/oikonomia/core/bills.ts`, three functions walk a bill's occurrences from its first date, at most 500 steps:

- `occurrencesBetween(bill, from, until)` (line 98)
- `occurrenceOnOrAfter(bill, from)` (line 88)
- `occurrenceBefore(bill, date)` (line 268, used by `standing`)

A weekly bill first due more than about 9.6 years ago (500 weeks) never reaches today: it has no dates in a range now, no "next"
date, and `standing` treats it as finished. Monthly bills hit the limit after about 41 years, which is why it went unseen. The loop
also costs time proportional to the bill's age for every call.

Callers affected, because they share these functions: Days ahead (through the calendar provider), Home's bill line (`billsSoon`),
the Bills list (`standing`, `nextBills`), the month and week calendar, Plan and budget totals, Pay, reminders (`core/reminders.ts`), the
payment history and the published bill events. No file outside `core/bills.ts` needs a change.

### 2.2 The correction

Add one helper that finds the first occurrence on or after a date without walking the history, and use it in all three functions:

```
firstIndexOnOrAfter(bill, from):
  once            -> 0
  weekly          -> days = round((from - dueDate) / 1 day); index = floor(days / 7)
  monthly         -> months = (from.year - due.year) * 12 + (from.month - due.month); index = floor(months / 1)
  quarterly       -> same months, floor(months / 3)
  yearly          -> same months, floor(months / 12)
  start one before that index (never below 0), then step forward while occurrenceDate(index) < from
```

- Dates still come from the existing `occurrenceDate`, which is anchored on the original due date (`addMonths(dueDate, index)`). So
  month-end handling is unchanged: a bill due on the 31st is the 28th (29th in a leap year), 31st, 30th, and so on, and a bill due on
  29 February keeps its present clamping. The helper only chooses where to start.
- The walk forward is at most two or three steps; the start is one period early so clamping and daylight-saving days cannot skip a date.
- `occurrencesBetween` starts at that index and stops when a date passes `until` or `endedOn`, as now. The 500 cap becomes a runaway
  guard on the number of dates returned (1,000), not a limit on history.
- `occurrenceOnOrAfter` returns the date at that index unless it is past `endedOn`, as now. `occurrenceBefore` returns the date one
  index earlier (or the due date for a one-time bill) instead of scanning.
- No stored data, field or setting changes.

### 2.3 What may change for people

Only bills the limit affected: a weekly bill first due over ten years ago starts showing its dates, its next date and its place in the
Bills list, and reminders for it will be written. Everything else returns the same values as before, which the tests below compare
directly.

### 2.4 Files affected

- `src/oikonomia/core/bills.ts` (the helper and the three functions)
- `src/tests/oikonomia/bills.test.ts` (new cases)
- `src/tests/providers/calendarTime.test.ts` (the `KNOWN DEFECT` test becomes an ordinary test)

### 2.5 Recommended tests (to run only when you authorize)

| Test | Why | Estimated time |
| --- | --- | --- |
| New against old: for weekly, monthly, quarterly, yearly and one-time bills, due dates on the 28th to 31st and 29 February, ranges before, inside and after the first date, with and without `endedOn`, the old loop (no cap) written into the test as the reference | Existing recurrence, month-end handling included, is unchanged | under 10 s |
| A weekly bill first due in 1990, and a monthly one from 1950, over a month and over a year | The defect is gone; no history walk | under 5 s |
| `standing`, `nextBills` and `paymentHistory` for a weekly bill first due 12 years ago | The Bills list and history use the same fix | under 5 s |
| The same cases in UTC, Pacific/Auckland and America/Los_Angeles, with ranges across the clock changes | Day arithmetic is clock-safe | under 30 s |
| `src/tests/oikonomia` and `src/tests/providers/calendarTime.test.ts` | The suites that read these functions | under 20 s |
| One timing line: `occurrencesBetween` on a weekly bill from 1990 | No cost that grows with age | seconds |

Deferrable: browser and visual checks (no markup changes), search, together. Reminders for old weekly bills change in effect, and
that is covered by the new-against-old and `standing` cases; a notification-level test is not needed.

---

## 3. Implementation record (both approved with the decisions below)

Decisions: the three new switches start off; the original four keep their defaults; a trip's place name is the only place in the
feed; booking addresses, routes, plan places, codes and notes are out; trip and bill downloads drop codes, notes and amounts; every
existing row is deleted and new links are required; old tokens cannot be served or rewritten; no full feed address or token is
logged by the app or the function; the page says external calendars may keep what they fetched; `occurrencesBetween`,
`occurrenceOnOrAfter` and `occurrenceBefore` all use the shared helper.

Two commits, kept apart: the recurrence correction (`core/bills.ts`, its tests) and the feed correction (everything else).

### Feed: what changed

- `feedLines` and `describeFeed` (`core/calendar/feedEvents.ts`); `buildCalendarFile` takes bills, trips and bookings from the
  calendar providers for the apps whose switches are on. `poreiaFeed.ts` is gone and `billCalendarEvents` has no amount.
- `tripEvents` and `poreiaEvents` (`poreia/core/calendar.ts`) write no notes, so a trip's own file and the feed hold no code or note.
- `supabase.ts` writes and reads format 2 only; `syncController.ts` marks a link that ended (`linkEnded`) so the page says so.
- `calendar-feed` serves format 2 only, adds `referrer-policy: no-referrer`, logs nothing.
- Migration `20261111000000_calendar_feed_format.sql`: adds `format`, deletes every row that is not format 2, and makes writes
  need `format = 2`.
- Settings > Calendar: three new switches; the description is built from the switches that are on; one line says what is never
  in the file; a line says calendar apps keep what they fetched and that the old subscription has to be removed there; a status line
  appears when a link was ended.
- `privacy.html`, `PrivacyGlance`, `SERVER_SETUP.md`, `CLAUDE.md`, What's new.

### Deployment dependencies, as found

- The client reaches people through the Cloudflare Worker build, which deploys when `main` is pushed. Nothing here is on `main`.
- The migration is run by hand in the Supabase SQL editor; no CI step applies migrations (`docs/SERVER_SETUP.md`).
- The function is deployed by hand: `supabase functions deploy calendar-feed --no-verify-jwt`.
- Old rows have no `format` (null). Old clients write without it.

### Deployment order (nothing below has been run)

1. **Deploy the function first.** It serves only format 2, so every old file stops being served at once, before the client and
   migration land. Old clients that keep publishing write rows with no format, which are never served.
2. **Release the client** (merge to `main` when you decide). New devices write format 2 files with the chosen categories. A device
   with the feed on finds no format 2 row and ends its link; the page says so.
3. **Run the migration.** It deletes the old rows and refuses writes without format 2, so an older client cannot put an old-format
   file back.
4. Read the three counts in 1.2 before step 3 and again after, and confirm one request each with an old token (404), a new token
   (200) and a malformed token (404).

Running the migration before step 1 or 2 would stop old clients from publishing but would leave the old function serving
nothing new either; it is not harmful, but step 1 is what ends serving, and it comes first so the window is shortest.

### Rollback limits

- Deleted rows cannot be restored from the app; there is no copy. Backups and point-in-time recovery may hold them until their
  retention ends, and restoring one would bring old plain-text files back; do not.
- Rolling the function back to the previous version would serve format-null rows again (none remain after the migration).
- Rolling the client back leaves old clients refused by the `format = 2` rule; the policy can be dropped and the old one
  recreated (the migration text shows both), but that restores the ability to write old content, so it is not advised.
- Nothing already fetched by a calendar app can be recalled. People remove the old subscription in the app.
- Logs: the link contains the token and the platform's own request logs may record it. The app and the function write no log of
  it, and every old token is dead after step 3. Platform log retention is outside this code.
