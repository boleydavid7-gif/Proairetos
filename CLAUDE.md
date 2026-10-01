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
- The user works rotating shifts (28-day days/evenings/nights rotation
  starting Tue 2026-09-29); never assume a standard schedule.
- Every sheet/screen must be leavable: Close/Cancel, swipe down, back
  gesture. Deleting anything offers undo.

## Commands

```
npm install
npm run dev          # local dev server
npm test             # vitest (171 tests), includes the language guard
npm run typecheck
npm run build        # tsc + vite build into dist/
npx wrangler deploy --dry-run   # validate the Cloudflare Worker config
```

## Deploying

- Cloudflare **Worker** (static assets) connected to GitHub; pushes to
  `main` deploy to the dev site https://proairetos.boleydavid7.workers.dev.
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
  Settings is a list of rows with detail pages.
- `src/components/ui/useSheet.ts`: every bottom sheet uses it.
- `src/components/layout/`: `PageHero` (landscape header, Compass),
  `Landscape` (landscape at the foot of Today), `PageHeader` (`settings`
  prop adds the gear). Settings returns to the last main tab
  (`useReturnRoute`). Today's caption is a daily Stoic line
  (`core/stoic/dailyLine.ts`, steady through the day; avoid quotes with
  banned words such as "should").
- `supabase/`: migration (RLS on every table) and the `send-reminders`
  edge function (payload-less push).

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

Not yet verified on a real phone: swipe gestures, fonts (EB Garamond via
Google Fonts), real Supabase emails and push delivery.
