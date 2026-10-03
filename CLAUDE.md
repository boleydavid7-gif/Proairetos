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
npm test             # vitest (300+ tests), includes the language guard
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
- `src/features/`: screens. Five tabs: Today, Reflect, Days ahead,
  Capture, Compass. Meditate opens from a card on Reflect (switchable in
  What's included); its tab-bar mark stays on Reflect. Days ahead uses routes `plan` (list) and `calendar`. Kinds are one
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
  above the free box; each kind opens its own page (`CaptureKindPage`: add
  box for that kind, its open captures, closed recently), and captures with
  no kind wait on a Not sorted yet page (with Sort through). A Grateful tile
  (`GratitudePage`, What's included part `gratitude`) keeps "I'm grateful for…"
  lines as reflections (promptKey `gratitude`), never as items. Close the day
  asks for Three good things (part `three-good-things`, promptKey of the same
  name; it replaced "What made today worth it"); both show in Reflect with a
  star. The Journal stays in Reflect only. Tiles show the
  newest titles, never counts. Reflect is a
  timeline; Journal (`features/journal/`) is the full-page writer with
  optional inner weather (the person picks it; the app never infers
  mood). Insights (`features/insights/`, `core/reflections/insights.ts`)
  only counts what was recorded: no trends, conclusions, or advice.
  Settings is labelled groups of rows (`SettingsGroup`: Your days,
  Notifications, The app, Your data, About; support row last) with
  detail pages, under a profile card. Calendars holds both other
  calendars and the subscription; What's included holds Quiet offers;
  About holds sources; Values live only in Compass. The name (greeting
  on Today) is a device-only preference.
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
- One backup for the family: the Proairetos backup file (`data/backup/format.ts`)
  also carries Askesis (workouts, plan), SOMA (recipes, groceries) and every
  app's settings from localStorage (`data/backup/family.ts`: prefixes
  `proairetos.`, `askesis:`, `soma:`; never the sign-in session, caches,
  drafts, other calendars' events, the calendar feed link, or Askesis songs).
  All optional in the format, so older backups still restore. Askesis and
  SOMA's Your data use the same card (`app/family/FamilyBackup.tsx`; their
  older files still restore through `older`); any app's backup counts as the
  one last backup (`proairetos.lastBackup`).
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
  items, schedules, each shift of a schedule (`TimeBlock.color`, carried
  onto occurrences; choosing one colours every shift with the same name,
  `colorShift`; it wins over the schedule's colour), and other calendars; items and schedules also take a
  `location`.
- Meditate (`features/meditate/`, route `meditate` under Reflect, lake photo
  `assets/images/scenes/lake.webp`): Sessions (`core/meditate/sessions.ts`,
  scripts of cues spread over 5-30 min, optionally read aloud by the phone's
  speech voice), Breathe (`core/meditate/breathing.ts`, `breathAt` drives the
  circle, counts, and breath sounds from one clock; the circle is still
  until a sit starts, then brightens on the in-breath and dims on the
  out-breath via `--light`, smoothed in JS (~0.35 s lag) and drawn with
  pre-blurred `screen`-blended layers so it reads as light; no moving dot).
  Each kind of sit (five session types + breathing) has its own setup
  (`core/meditate/setup.ts`: length, words often/now and then/rarely/none,
  read aloud, circle pace, counts, bells, breath sounds, sounds, music);
  preferences keep only what changed. Sounds and Music tabs are switches
  ("Plays during" a chosen kind) plus a 20 s preview; nothing plays
  outside a sit except a preview. All
  real recordings in `public/sounds/*.mp3` (sources and licences in
  `docs/SOUNDS.md`). `app/sound/`: `engine` (audio clock, iPhone media
  trick `wakeAudio`/`letGo`, recordings kept in Cache Storage
  `proairetos-sounds`; the service worker skips `/sounds/`), `soundscapes`
  catalogue, `player` (`startSit`: sounds looped from decoded buffers,
  layered, + one piece of music streamed through a media element; start
  it inside the tap; `preview`).
  Breath sounds: one recorded breath split into `breath-in.mp3` and
  `breath-out.mp3`, played at natural speed as each step starts (stretching
  it sounded wrong). `SitScreen` is portalled to body.
  Nothing about a sit is recorded.
- Notifications (Settings > Notifications, `features/settings/NotificationsSection`:
  one plain list of switches, a lead or time beside a switch only while
  it is on, Coming up folded; keep explanations out of it):
  written on the device. `core/notify/notices.ts` (`noticesBetween`: timed
  items by their `remind` minutes, absent = at the time, [] = none; other
  calendars with a lead; own schedule blocks; check-backs and look-backs at
  9:00; an optional look at the day; quiet hours hold and re-word them;
  `privateNotice` for a private lock screen). `app/notify/`: `upcoming.ts`
  gathers sources; `notifications.ts` keeps the next 14 days in Cache
  Storage `proairetos-notify` for the service worker, shows them by timer
  while the app is open, and feeds the server only times
  (`sync/reminders.ts` `reminderTimes`). The SW's push handler shows the
  stored words (generic text only if none found); a tap opens `?open=`
  (`NoticeOpener`: item, day, Today, Reflect). Background delivery needs
  sync + the `send-reminders` function (server setup still paused).
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
  Moving between places uses view transitions (`app/transitions.ts`):
  every route change goes through `go()` in App (tabs slide by bar order,
  pages push in and pop out); a page's own tabs call `transition(...,
  'panel')` and key their `.vt-panel` by tab: no snapshot there, the new
  content just slides in (Safari tinted snapshots of filtered photos green). The tab bar holds still
  (`view-transition-name`). Without support or with reduced motion,
  changes are immediate with a soft fade.
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

## Askesis (training app, same repository)

- A second app served at `/askesis/` (`askesis/index.html` -> `src/askesis/`),
  built by the same `vite build` (multi-page `rollupOptions.input`). Its own
  manifest, icons and service worker in `public/askesis/` (scope `/askesis/`),
  so it installs as its own home-screen app. The Proairetos `sw.js` ignores
  `/askesis` entirely (never cache its page as Proairetos's shell). Linked from
  Proairetos Settings > More apps.
- Same rules as Proairetos: no streaks, scores, locks or "missed"; sessions not
  done pass with the week; moving on a week is offered (`Week N is ready`), never
  automatic; "That's the session", not praise; undo on delete.
- One path toward the person's own aim (`core/plans.ts`, `buildPath`): an
  Aim is a time ("45 minutes without stopping"), a distance (5K to marathon
  or their own), or steady (keep running; a 4-week rhythm that wraps, see
  `weekAt`). Weeks 1-10 are always the walk-run start; after that weekly
  time grows ~7.5% (5% gentler) toward what the aim needs (`needs`), running
  days are added one a week, every 4th week easier, the long run +10 min a
  week at most; distance aims build 8+ weeks, then Shape, Taper and the aim's
  week; time aims end on the week whose long run is the aim. A date counts
  back (`fit`: hold weeks or fewer growth weeks, never faster). Growth stops
  when the chosen days hold no more (4 building weeks without more time).
  Everyone begins at their own week 1: `ownPath` takes the full path from the
  week they joined (`fromWeek`, ids kept so logs stay linked; `joinWeek` can
  be below 1 after a change partway; `weekAt` finds weeks by number; older
  plans migrate once, `numbering: 'own'`). Setting an aim (`PlanPage`) is three
  steps: Where you are now (a test: how long they walk briskly and run at
  once, weekly hours if 30+ min; `suggestedLevel` -> Beginner/Intermediate/
  Advanced, changeable; `placementFor` + `joinFor` place week 1, using the
  longest run too so long runs have room; or "Carry on from week N"; "Try a
  test run" (`TestPage`: walk 5 min, run until you'd walk) fills the run
  answer), Where you want to be, Your plan. Short walkers get two walking
  weeks first (`walkFirst`); a gentler path also takes the bigger walk-run
  steps twice (`startIndex` marks walk-run steps). A time aim they can
  already run says so. Keep explanation lines out of Askesis screens.
  When a week is taken again (`PlanState.again`) or runs felt hard, the
  new-week card offers "More gradually" (`moreGradual`: gentler path, same
  week number, weeks added; not with a date).
  The session screen: title, length, a session bar (`app/SessionBar`, also
  small on Home and Train), plain lines (`sessionLines`: Run/Walk), Start,
  then Log it / Lighter today, and Step by step, Why, Tips and the
  intention folded below.
  Each new week reads the log (`core/progress.ts`, `suggestWeek`): walk-run
  weeks move on when most sessions were logged; later, a week run as written
  suggests the next, clearly more carries ahead to the furthest growing week
  within ~10% of the busiest recent week and 10 min of the longest run, much
  less offers the week again or an earlier one, two hard runs offer it again.
  Home's card shows the facts, the reason, what the week builds
  (`stageBuilds`) and weeks to the aim from there; the runner picks. Train
  shows Started / Now and their own first two weeks beside the last three
  (`thenAndNow`), days run since the first (`runDays`) and how runs felt
  over four weeks as marked (`howItFelt`).
  Sticking with it, from the research: their own reason (`PlanState.why`,
  asked in Where you want to be; shown on the new-week card and before a
  run), a time and place (`runAt`, `place`) and an if-then plan (`ifThen`,
  shown on Home on the day). Run days with a time become Proairetos notices
  (`runTimes` in `app/askesis/runs.ts`, kind `run`, switch "Run days, from
  Askesis", tap opens `/askesis/`); quiet hours hold them like any other.
  `PlanState` keeps aim, own words, join
  week, date, gentler; old level plans convert (`fromOldPlan`). Tests hold
  80 combinations to the science rules. Reaching the aim shows `LookBack`
  (facts from the log; new aim / just keep running / rest a week; mark the
  Compass goal reached).
  Effort scale in `core/effort.ts`; HR zones (Tanaka, Karvonen) in `core/zones.ts`.
  Sessions in a week are never identical (beginner weeks have three close
  variants; plain easy runs are 5 min apart, the long run stays 10+ min
  longer) and every session totals a multiple of 5 min (`roundSession`
  adjusts the last stretch). Each session shows its weekday (`sessionWeekdays`);
  Home's This week has a quick Log per day (entry route `date` + `workoutId`).
- Data: workouts and the plan live in the Proairetos database (DB 7 stores
  `askesisWorkouts`, `askesisPlans`, record id `current`), so they sync,
  sealed, with the same account and key: signing in to Proairetos covers
  Askesis (`main.tsx` runs `startStore()` then `startSync()`; writes call
  `syncSoon()`; `onRemoteChanges` reloads). Device settings in localStorage.
  The server accepts the two collections after migration
  `20261003000000_askesis_sync.sql`; until then the engine holds them
  (`laterCollections`, `SyncResult.held`) and Proairetos records sync as before.
  The first version's `askesis` database moves over once and is deleted.
  Reads (never writes) the Proairetos schedule to mark sessions after nights.
- Motion: same as Proairetos: `app/transitions.ts` (tabs slide by bar order,
  pages push in, back comes forward), sliding segmented highlight (`--count`,
  `--at` set inline), press spring, choices pop, `tap()` (Gentle taps) on
  each guide step change.
- Learn articles (`core/learn.ts`) cite sources; daily Stoic line and the
  optional "What part of this is up to you?" intention (`core/stoic.ts`).
- Bending to a life (`core/gentler.ts`): "Lighter today" swaps a session for
  an easier version for that day only (`PlanState.lighter`, `asToday`);
  after 2+ weeks with nothing logged (counted from the later of the last
  workout and the plan's start) an earlier week is offered once
  (`comeBackOffer`, `comeBackAsked`). After saving a new workout, `AfterPage`
  offers a minute of breathing and one line kept in Proairetos Reflect
  (promptKey `after-run`); Settings > What's included turns it and the daily
  line off.
- Askesis writes to Proairetos only when asked: "Add to Compass" on the plan
  page (`GoalLink`) makes a GOAL and, if chosen, weekly PROTECTED time on the
  run days (`goalSchedule`), linked by `PlanState.goalId`; changing the run
  days moves that time too (`moveGoalTime`, with undo). Logging from the Log
  tab on a day with an open session offers to count it as that session.
- Proairetos reads Askesis (`app/askesis/runs.ts`, Today part `askesis` in
  What's included): today's session as a row on Today (`TodayRun`), runs in
  Done today and in the Reflect timeline (`RunEntry`).
- Appearance follows Proairetos (`applyAppearance`: theme and text size);
  light tokens at the end of `askesis.css`; words over photos stay light.
- Guide (`screens/GuidePage.tsx`): wall-clock steps, spoken cues, wake lock.
  Bells for the whole session (`core/cues.ts`: two low to walk, one to run,
  one bright for faster, three to finish) are handed to the audio clock at
  Start (`app/runAudio.ts`) and again after a pause or on looking back, so
  they keep time with the screen locked while the page plays as media
  (`wakeAudio`, session `playback`). Pocket mode: black screen, hold to wake.
  Music (`app/music.ts`, More > Music): None, Songs here (files from the
  phone in IndexedDB `askesis-music`, device only, not synced or backed up;
  played through the audio clock so it softens under each bell; shuffle; Next
  song in the guide), or Another app (session `ambient` to mix; screen on).
- Photos: `src/askesis/assets/scenes/*.webp` (cut from the owner's sheet; low
  resolution, replace with larger originals when available).

## SOMA (recipes, same repository)

- A third app at `/soma/` (`soma/index.html` -> `src/soma/`, own manifest,
  icon (leaf sprig) and service worker in `public/soma/`; Proairetos's
  `sw.js` ignores `/soma`; linked from Proairetos Settings > More apps).
  Plan and what is built: `docs/SOMA.md`. Records, never judges: no
  calories, scores or good/bad food; Ways to try it (`core/tryIt.ts`) are
  optional, sourced, kept only as the person's notes.
- Recipes and groceries in IndexedDB `soma` (`data/store.ts`), device only for
  now; settings in localStorage `soma:settings`. Import through the Worker
  bridge `/api/recipe` (`worker/recipeProxy.ts`, JSON-LD only, nothing
  stored) or pasted text; Ideas from TheMealDB (direct, CORS). Groceries by
  aisle (`core/aisles.ts`, first matching phrase wins; moves remembered in
  `aisleChoices`). Reuses Askesis UI pieces and `askesis.css`, with
  `soma.css` tokens on `:root.soma`. "I cooked this" can keep a line in
  Proairetos Reflect (promptKey `after-meal`).
- The language guard covers it: no `loading="lazy"` (write images without it).

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
