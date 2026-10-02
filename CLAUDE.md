# Proairetos: notes for Claude

A personal operating system for intentional living: organizer + Stoic
reflection + mindfulness + ADHD-friendly design. Mobile-first installable
web app (React 19 + Vite + TypeScript), local-first with optional
end-to-end encrypted sync (Supabase).

Read `docs/PRODUCT_ARCHITECTURE.md` before changing behaviour. Its core
rule: **the system records life; it does not interpret life.**

## Non-negotiable product rules

- No scores, streaks, rewards, "overdue", failure states, or shame language.
  Relief instead of praise (calm close-out with undo).
- The app never decides what matters, ranks priorities, infers mood, or
  gives unrequested advice. The person chooses; the app reflects back.
- Banned words are enforced: `src/core/rules/languageRules.ts`, and a test
  scans **every source file, comments included** (overdue, failed, stalled,
  lazy, avoiding, behind, should). Reword rather than disable.
- Capture first; sorting optional. Values are user-chosen (max five).
- Universal: for anyone, on any schedule or none. UI wording stays
  neutral (work, study, care); never assume a 9-to-5 or shift work. The
  owner's 28-day days/evenings/nights rotation (from Tue 2026-09-29) is a
  demanding test case, not the target.
- Never a chore: everything is offered, never asked twice; nothing
  piles up or needs catching up; one tap, under a minute.
- Every sheet/screen must be leavable: Close/Cancel, swipe down, back
  gesture. Deleting anything offers undo.

## Commands

```
npm install
npm run dev          # local dev server
npm test             # vitest (268 tests), includes the language guard
npm run typecheck
npm run build        # tsc + vite build into dist/
npx wrangler deploy --dry-run   # validate the Cloudflare Worker config
```

## Deploying

- Cloudflare **Worker** (static assets) connected to GitHub; pushes to
  `main` deploy. The site is https://proairetos.com (custom domain on
  the Worker); https://proairetos.boleydavid7.workers.dev is the old
  address and shows a "moved" notice (`app/MovedNotice.tsx`), since
  browser data does not cross addresses (backup, then restore).
  Config: `wrangler.jsonc` (single-page fallback; `worker/index.ts` handles
  only `/api/*`). `public/_headers` keeps
  `sw.js` and the shell uncached; do not add long "immutable" rules for
  `/assets` (unknown paths serve the app page).
- The user deploys from `main`. Work on the session branch and push to
  both the branch and `main` once checks pass.

## Architecture map

- `src/core/`: pure domain logic, no I/O. Commands return
  `{ item, events }`; history is event-based (`item-events`). Scheduling
  (`scheduling/`): any schedule is a repeating cycle of runs; overnight
  blocks; one-day exceptions; DST-safe local-date math in `dates.ts`.
  Also routines (`life-items/repeat.ts`), focus sessions, rhythm (time
  away, check-back, pause offers), observations, decisions.
  The person's day (`rhythm/personalDay.ts`, `usePersonalDay`): a day
  turns over at a chosen hour, but a work block running past it carries
  the day until 3 h after it ends (night shifts). Today, Plan, path,
  intention and Done today use it; Reflect periods stay calendar-based.
- `src/data/`: repositories (IndexedDB + in-memory, same interfaces),
  `storage/indexeddb/database.ts` (DB_VERSION 6; add stores with an
  upgrade test), backup format/crypto, `sync/` (keys, engine, Supabase
  adapter, local stores).
- `src/services/`: application services; they serialize writes (life
  service queue), notify listeners, and expose `refresh()` for sync.
- `src/app/`: shell, routes, overlays (sheets, focus, pause, undo toast),
  `back/` (one back stack for Android back, browser back, edge swipe),
  `sync/` (controller, reminder times).
- `src/features/`: screens. Six tabs: Today, Reflect, Days ahead,
  Meditate, Capture, Compass (Meditate can be switched off in What's included). Days ahead uses routes `plan` (list) and `calendar`. Kinds are one
  set everywhere (`core/life-items/kinds.ts`: To do, Remember, Concern,
  Idea, Feeling), read from the stored type + capture tag. Settings >
  What's included switches parts of Today and the app on or off
  (`useTodayParts`; `startLight()` gives new people a lighter Today).
  Compass is tabbed (Values, Goals, People, Words). The item sheet shows
  essentials and puts the rest under More. Today = `features/now/NowPage.tsx` (greeting, daily Stoic
  line, intention, Today's path = up to three picks, timeline, folded
  lists, done today, landscape at the foot). Each day in Days ahead lists its
  untimed to-dos by the person's own marks (Important, Maintenance,
  Meaningful; `features/plan/planView.ts`, `days/DayPlan`). Capture has the five kinds
  above the free box. Reflect is a
  timeline; Journal (`features/journal/`) is the full-page writer with
  optional inner weather (the person picks it; the app never infers
  mood). Insights (`features/insights/`, `core/reflections/insights.ts`)
  only counts what was recorded: no trends, conclusions, or advice.
  Settings is a list of rows with detail pages, under a profile card;
  the name (greeting on Today) is a device-only preference.
- Practices are woven in, never a feature: `core/practices/practices.ts`
  (short steps + credited source), shown by `features/pause/PracticeScreen`.
  Pause ends with "Another way to pause"; a Feeling capture may get a
  quiet "Sit with it" offer (`components/ui/QuietOffer`, rules in
  preferences `takeOffer`: at most one offer a day, "not for me" hides a
  kind, a Settings switch turns all off); a Concern's sheet starts with
  "What part of this is up to you?"; "Close the day" appears on Today
  from `closingFrom()` (last hours of the person's day, or after the
  day's last work block). Plain words in the UI, no labels or counts.
  Also woven in: the daily line turns over to "Try it today" (`tryIt`
  in `dailyLine.ts`); "From a while ago" folds old open concerns into
  Today's chips (`rhythm/aWhileAgo.ts`: 21+ days, keep rests 30 days);
  value cards reveal "In practice" (`values/descriptions.ts`); empty
  Plan/Reflect/Capture show a `GentleLine` (`stoic/gentleLines.ts`).
- Today is shaped by the person: `useTodayParts` (Settings > What's
  included; "Not for me" sets a part aside with undo,
  offered once a part was shown on 3 days: `partSeen`) and a Lighter view
  (`LighterView`, the leaf; for the day it is chosen, easing back the next
  day). Things not sorted lead to Sort through, which also sets the kind.
  An item's When is one field: a day, plus a time if it has one
  (time -> `scheduledAt`, day only -> `plannedFor`). Lists that come back are routines with a
  `checklist` that clears each time (`setChecklist`); they stay off the
  timeline and send no reminders. Reminders respect quiet hours and
  protected time (`rhythm/quietHours.ts`; held, never dropped).
- Trust: Support screen (`features/support/`, crisis lines, reached from
  Settings and practices, never triggered by content); public
  `public/privacy.html`; `delete-account` function; backup offer
  (`rhythm/backupOffer.ts`). Appearance: `app/appearance.ts` sets
  `data-theme` (dark default, light, system) and text size; light tokens
  in `tokens.css`. People who matter: Compass statements of type PERSON.
  `FEEDBACK_EMAIL` in `app/siteAddress.ts` shows Send feedback when set.
- Other calendars (read-only, device-only): `app/calendars/otherCalendars.ts`
  (sources + cached events in localStorage, refresh hourly on open),
  `core/calendar/readIcs.ts` (ical.js, lazy-loaded; repeats, exceptions,
  time zones). Links that block web fetches go through the Worker bridge
  `worker/calendarProxy.ts` at `/api/calendar` (https only, calendar files
  only, nothing stored). `wrangler.jsonc` runs the Worker only for `/api/*`;
  the service worker never caches `/api/`. Events show in Today's timeline
  and in Days ahead. Each calendar has a role (Just show / Counts as work /
  Counts as protected time); `blocksBetween()` turns timed events from
  counting calendars into schedule-shaped blocks for `usePersonalDay`,
  `closingFrom`, and reminder quiet hours.
- Weather (opt-in, `app/weather/weather.ts`, Open-Meteo, no key): the
  sky beside the icons on Today (`TodayWeather`), and recorded as
  `sky` on new reflections (Journal, Close the day, look-ahead plan).
  Reflect's mark: chosen inner weather, else sky, else sun/moon by clock.
  Place rounded to ~1 km, device-only; codes mapped in `core/weather/sky.ts`.
- Planning help that leaves the choice with the person: Capture's "Empty
  your head" (`core/capture/brainDump.ts`: on-device split + first guess
  of kind and named day, reviewed before saving); "Sort through"
  (`features/capture/QuickSortSheet`, plain facts from
  `core/life-items/facts.ts`); Today's "Open time"
  (`core/rhythm/openTime.ts`, gaps after blocks, events, set times, quiet
  hours; tap to give something a time); overlap notes
  (`core/rhythm/overlaps.ts`, never moves anything itself); the item's
  `light` mark and a per-day energy word (`energyFor`, never guessed) that
  only shows light things first; values beside path picks and "What would
  X look like today?" on an opened value. Insights adds when things got
  done and this period beside the last (plain counts, no arrows).
- Inner work, offered never pushed: "Think it through"
  (`core/practices/thinkThrough.ts`, `features/pause/ThinkThroughScreen`;
  CBT thought record + Epictetus, every step skippable, kept in Reflect
  only if chosen) from Pause's list, a concern's sheet, and a quiet offer
  after a Concern capture; "Come back to the room" grounding practice.
  Goals: Compass "Working toward" (statement type GOAL, `reachedAt`; items
  link by `goalId`; `core/compass/goals.ts` lists next steps and steps
  taken with dates; no percentages or targets). A goal can have a colour
  (its steps take it) and "Make time for this": a weekly PROTECTED schedule
  (`core/compass/goalTime.ts`, linked by `patternId`) whose blocks show the
  goal's next step on Today and Days ahead (`goalLines`). Never checked.
- Days ahead: two pages, routes `plan` (list) and `calendar`
  (`features/days/DaysAheadPage`), seven days at a time with week steps;
  the calendar has Week (hours), Month (Sunday-first grid with colour
  dots and a count; the chosen day lists below),
  and Year (marked days; tap a month). Opened from "Your day" on Today (tapping
  an entry passes the day and entry via `setDaysAheadOpening`). One round
  + button adds something at a time or for a day (`AddEventSheet`). Colours are the person's
  labels (`core/look/tagColors.ts`, `--tag-*` tokens, `ColorChoice`) on
  items, schedules, and other calendars; items and schedules also take a
  `location`.
- Meditate (`features/meditate/`, route `meditate`, lake photo
  `assets/images/scenes/lake.webp`): Sessions (`core/meditate/sessions.ts`,
  scripts of cues spread over 5-30 min, optionally read aloud by the phone's
  speech voice), Breathe (`core/meditate/breathing.ts`, `breathAt` drives the
  circle, counts, and breath sounds from one clock; the circle is still
  until a sit starts, then glows out on the in-breath and dims on the
  out-breath via `--breath`; no moving dot), Sounds and Music. All
  audio is generated on device with Web Audio (`app/sound/`: `engine`,
  `soundscapes` catalogue, `player` singleton with one sound + one music,
  volume, stop-after timer, limiter; `breath` for breath sounds and bells).
  `SitScreen` is portalled to body; `NowPlaying` shows what plays on other
  tabs. Nothing about a sit is recorded.
- Search (`core/search/search.ts`, `features/search/SearchSheet`, the
  magnifier beside the gear on every main tab): items, reflections,
  decisions, Compass; every word must match, newest first, all on device.
- Share into Capture (Android): `share_target` in `public/manifest.webmanifest`
  sends `?share_title&share_text&share_url` to `/`; `features/share/` reads
  it once, cleans the address, and offers a Capture sheet. Bump the
  service worker cache when the manifest changes.
- End times: items take `endsAt` (Until); moving the start keeps the
  length (`movedTo` in commands, routines too); `itemSpan` uses it.
- Bring things in (Settings): `core/import/readers.ts` reads a calendar
  file (one-off events; repeats are left to Other calendars), CSV and
  Todoist exports (ISO dates only), Google Tasks (Takeout JSON), and plain
  lists; `features/settings/BringInSection` shows every row before saving.
- Photos and files on items: `attachments` store (DB 6), `services/attachments`,
  `features/items/attachments/` (photos resized to 1600px JPEG, 10 MB cap,
  viewer, remove with undo; deleting an item takes its files, undo restores
  both). On device and in backups (base64, optional so older backups still
  restore); not synced.
- `src/components/ui/useSheet.ts`: every bottom sheet uses it.
- `src/styles/globals.css` only imports `parts/NN-*.css` in cascade
  order; add new styles to the matching part (or a new last part).
  `29-touch.css` (last) keeps every control at least 44px to tap.
  `28-calm.css` is the calm pass: one level of borders, muted text links,
  gold kept for one main action per screen, theme tokens for surfaces.
  `28-motion.css` holds motion (ease tokens, press `scale`, sliding
  segmented highlight, tick pop, page fade: opacity only so Today's fixed
  landscape stays put). Sheets glide out via `useSheet().close` (always use
  it, not `dialog.close()`). `app/feel.ts` `tap()` buzzes on tick-off when
  Appearance > Gentle taps is on.
- `src/components/layout/`: `PageHero` (landscape header, Compass),
  `Landscape` (fixed behind the lower half of Today, fading in from halfway; tab bar sits above it), `PageHeader` (`settings`
  prop adds the gear). Settings returns to the last main tab
  (`useReturnRoute`). Today's caption is a daily Stoic line
  (`core/stoic/dailyLine.ts`, steady through the day; avoid quotes with
  banned words such as "should").
- `supabase/`: migrations (RLS on every table), the `send-reminders`
  edge function (payload-less push), and `calendar-feed` (serves the
  optional calendar subscription by secret token; deployed with
  --no-verify-jwt). The feed is the one thing the server can read, only
  if the person turns it on; built on the device by `core/calendar/`
  (ics + what to include, default commitment times titled "Busy") and
  republished after each sync (`syncController` calendar section).

## Testing approach that has worked

- Unit tests for domain, services, repositories (fake-indexeddb), sync
  engine with a fake server, crypto. Run time-sensitive tests in several
  time zones (`TZ=Pacific/Auckland npx vitest run`).
- Browser checks with Playwright against `npm run build` + `vite preview`.
  Chromium is at `/opt/pw-browsers/chromium` (pass `executablePath`).
  Use `page.clock` for time; exact selectors (`getByRole(..., { exact })`)
  because `text=` matches substrings.
- Sync was tested end to end with a stand-in Supabase via `page.route`,
  and the SQL migration against a local Postgres 16 with stub `auth`.
- Avoid `pkill -f <pattern>` in a shell command that contains the
  pattern; it kills its own shell. Use `kill $(pgrep -f "[w]rangler")`.

## Status

Built: capture, sorting, item sheet, routines, waiting/check-back,
scheduling with rotations, Today timeline and countdowns, Compass (values,
statements, look-ahead with obstacle plan), focus timer, pause (MBCT
breathing space), decisions journal, Reflect (observations, prompts,
weekly review), backup/restore/delete, deletions with undo, back
navigation, offline PWA, encrypted sync + reminders (code complete).

Paused by the user until the app is near complete: **server setup**.
Supabase project and tables exist. Remaining steps are in
`docs/SERVER_SETUP.md` (Site URL, copy URL + publishable key, VAPID keys,
Cloudflare build variables, deploy function, cron). Sign-in accepts the
email's link (templates are locked on the free plan without custom SMTP).

Calendar subscription: code complete, needs the server (second
migration + `calendar-feed` function); the download-a-file option works
without it. Not yet tested against a live Supabase.

Not yet verified on a real phone: swipe gestures, fonts (EB Garamond and
Inter, bundled via @fontsource), real Supabase emails and push delivery.
