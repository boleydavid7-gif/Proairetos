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
npm test             # vitest (216 tests), includes the language guard
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
  Config: `wrangler.jsonc` (single-page fallback). `public/_headers` keeps
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
  `storage/indexeddb/database.ts` (DB_VERSION 5; add stores with an
  upgrade test), backup format/crypto, `sync/` (keys, engine, Supabase
  adapter, local stores).
- `src/services/`: application services; they serialize writes (life
  service queue), notify listeners, and expose `refresh()` for sync.
- `src/app/`: shell, routes, overlays (sheets, focus, pause, undo toast),
  `back/` (one back stack for Android back, browser back, edge swipe),
  `sync/` (controller, reminder times).
- `src/features/`: screens. Five tabs: Today, Reflect, Plan, Capture,
  Compass. Today = `features/now/NowPage.tsx` (greeting, daily Stoic
  line, intention, Today's path = up to three picks, timeline, folded
  lists, done today, landscape at the foot). Plan (`features/plan/`)
  groups checklists by the person's own marks (Important, Maintenance,
  Meaningful; logic in `planView.ts`). Capture has optional kinds
  (Thought, Emotion, Concern, Idea) above the free box. Reflect is a
  timeline; Journal (`features/journal/`) is the full-page writer with
  optional inner weather (the person picks it; the app never infers
  mood). Insights (`features/insights/`, `core/reflections/insights.ts`)
  only counts what was recorded: no trends, conclusions, or advice.
  Settings is a list of rows with detail pages, under a profile card;
  the name (greeting on Today) is a device-only preference.
- Practices are woven in, never a feature: `core/practices/practices.ts`
  (short steps + credited source), shown by `features/pause/PracticeScreen`.
  Pause ends with "Another way to pause"; an Emotion capture may get a
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
- Today is shaped by the person: `useTodayParts` (Settings > What Today
  shows; "Not for me" sets a part aside with undo) and a Lighter view
  (`LighterView`, the leaf). Lists that come back are routines with a
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
- `src/components/ui/useSheet.ts`: every bottom sheet uses it.
- `src/styles/globals.css` only imports `parts/NN-*.css` in cascade
  order; add new styles to the matching part (or a new last part).
  `29-touch.css` (last) keeps every control at least 44px to tap.
- `src/components/layout/`: `PageHero` (landscape header, Compass),
  `Landscape` (landscape at the foot of Today), `PageHeader` (`settings`
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
