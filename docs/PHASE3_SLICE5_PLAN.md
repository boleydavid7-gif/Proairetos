# Phase 3, Slice 5: Notices and notifications

Status: plan for review. No application code, migration, test or build was changed or run to write it. Everything
below comes from reading the files named in it.

## 1. Current architecture and findings

### How a notice is made and reaches a person today

One pure shape, `Notice` (`src/core/notify/notices.ts`): `{ key, kind, at, title, body, open }`. `key` is stable and
doubles as the notification tag. Every consumer takes a `Notice[]` from one function:

```
upcomingNotices(now, settings)            src/app/notify/upcoming.ts
  ├─ noticesBetween(...)                  Proairetos's own: items, other calendars, schedule blocks, check-backs,
  │                                       look-backs, "look at the day", bell, plus askesis runs, oikonomia bills,
  │                                       and the praxis study end passed in as plain inputs
  ├─ familyNotices(now, until)            src/app/notify/familyNotices.ts: Diaita, Philia, Ergon, Therapeia,
  │                                       Dynamis, Ktema, Meletē, Phyton, Poreia (each a pure core/notices.ts)
  ├─ pursuitNotices(...)                  Compass pursuits (Proairetos)
  hydrationUpcoming(now)                  Hydros (rolls forward after each delivery)
```

Consumers of that list (all take it as it is; none reads an app's records on its own):

| Consumer | File | What it does with it |
| --- | --- | --- |
| In-app timer, catch-up, Cache Storage for the worker, phone local notifications | `app/notify/notifications.ts`, `app/native/localReminders.ts` | Shows due notices while an app is open; keeps the next 14 days in `proairetos-notify` for `sw.js`; schedules the soonest 60 on a phone shell. `privateNotice` swaps in the app name when "Details on the lock screen" is off. |
| Closed-app delivery | `updateReminders` in `app/sync/syncController.ts`, `core/notify/sources.ts`, `send-reminders`, `sw.js` | Per source (`sourcesToWrite`, `sourceOf` from manifest `notices.kinds`): an opaque id (`hash(key:at)`), the fire time, the words sealed with the account key, and, only with details on, plain preview columns. |
| Notifications page | `app/notify/inbox.ts`, `core/notify/inbox.ts` | `cameDue` takes notices whose time came in the last 3 days (kept kinds only). Schedule changes and milestones are made there, not by `Notice`. |
| Settings > Notifications "Coming up" | `features/settings/NotificationsSection.tsx` | Reads `notifications.next()`. |
| Older helper | `app/sync/reminders.ts` `upcomingReminders` | Items and decisions only. |

### What is already built that this slice reuses

- The manifest already holds each app's `notices` block: `source`, `kinds`, `switches`, `page`, `genericTap`, `pushIcon`,
  `mainWrites`. `Capability` already lists `'notices'`; no app declares it in `provides` yet.
- `ProviderHost` (`core/providers/host.ts`) has `searchProjections`, `homeRows`, `calendarLines`; each checks the app is
  added and usable, the capability is on, the manifest allows it, runs the provider, then cuts output with an `enforce*`
  function in `policy.ts`. There is no `noticeLines` yet.
- `ProviderContext` has `today`, `now`, `records`, `setting`, `schedule`, `day`, `range`.
- Per-app pure notice functions already exist, take plain records and choices, and are already unit-tested
  (`src/<app>/core/notices.ts`). The move is to put each under a provider, not to rewrite them.
- Parity method exists (`scripts/calendar-check`, `scripts/home-check`, baselines in UTC and Los Angeles).

### Which apps contribute notices today

| App | Kinds | Where it is gathered now | Switch (`NoticeSettings`) | Needs beyond its own records |
| --- | --- | --- | --- | --- |
| Proairetos (items, calendars, schedule, check-back, look-back, day, bell, pursuits) | item, calendar, schedule, check-back, look-back, day, bell, pursuit | `noticesBetween`, `pursuitNotices` | items, calendars, schedule, checkBacks, lookBacks, day, bell | quiet hours, schedule. Stays native (section 3). |
| Askesis | run | `upcoming.ts` (`readRuns`, `runTimes`) | runs | the shared training week fit with Dynamis |
| Oikonomia | bill | `upcoming.ts` (`billReminders`) | bills | none |
| Praxis (retired into Theoria) | study | `upcoming.ts` (`studyEnd`) | study | the running focus timer (device state) |
| Hydros | hydration | `hydrationUpcoming` | none (own page) | last drink, work blocks, quiet hours; rolls forward after each delivery |
| Diaita | rhythm | `familyNotices` | rhythm | schedule and other calendars (sleep plan), sun place |
| Philia | person | `familyNotices` | people | none |
| Ergon | chore | `familyNotices` | chores | household actor, days off (schedule) |
| Therapeia | dose, care | `familyNotices` | medicines | sleep anchors from Diaita's plan |
| Dynamis | training | `familyNotices` | training | training week fit, Dynamis workouts |
| Ktema | upkeep | `familyNotices` | upkeep | none |
| Phyton | plant | `familyNotices` | plants | weather place, rain and forecast caches |
| Poreia | trip | `familyNotices` | trips | none (flight status is a separate live path) |
| Meletē | melete | `familyNotices` | melete | none |
| Soma, Theoria, Mneme | none | n/a | n/a | n/a |

Not notices, not touched: Poreia flight status (`showNow`, network, open app only), Phyton's frost check in its own
worker (Periodic Background Sync), milestones and schedule changes (made in `inbox.ts`), household invites (inbox).

### Findings that matter for the design

1. **Every consumer already works from one `Notice[]`.** If the provider path produces a list with identical keys, times,
   words and open addresses, delivery, sync, catch-up, the notifications page and the worker need no change at all.
2. **Identity is the key.** The closed-app row id is `hash(key:at)`, the notification tag is `key`, catch-up and the
   worker's "already shown" list use `key`. Any change to a key or a time creates a second server row and a second
   notification for the same thing. Keys must be byte-identical.
3. **Notices are not like calendar lines.** They are a schedule of moments (a lead time, a chosen clock time, a rolling
   interval) and some depend on the clock and on other state (last drink, a running timer). They are derived on the
   device for 14 days and then sent to the server as times only; the words are sealed.
4. **The switch is already the per-app gate** (`NoticeSettings` keys listed in each manifest `notices.switches`). The
   provider host's own `enabled(app, 'notices')` would be a second switch; CLAUDE.md says nothing new asks for
   attention unless the person chose it, so the existing switch stays the only gate.
5. **`privateNotice` is the single privacy gate for words.** With "Details on the lock screen" off every notice becomes
   the app's name plus the time, in the cache, the native schedule, the sealed words and the preview columns.
6. **With details on, the server holds plain preview text.** `preview_title`, `preview_body` and `preview_open` are
   written in plain text beside the sealed words so an iPhone's Declarative Web Push can show them. That is existing,
   documented behavior, and it is why the field audit in section 4 matters. It is raised as an open decision.
7. **Other calendars' blocks are device-only and are not in `ProviderContext`.** `familyNotices` merges
   `scheduleService` occurrences with `otherCalendars.blocksBetween` for Diaita and Therapeia. The context has
   `schedule?` (own schedule) only.
8. **Apps refresh notices themselves.** Each app's state module calls `notifications.refreshSoon()` on a change, and
   `notifications.start()` watches life items, decisions, the schedule and other calendars. That event-driven refresh
   is already debounced (800 ms). It stays as it is.

## 2. Notice types and the right mechanism for each

Not everything belongs in one mechanism. The slice splits notices by how they come to exist.

| Type | Examples | Mechanism | In this slice |
| --- | --- | --- | --- |
| Upcoming events and deadlines | Poreia bookings and plans, Therapeia visits, Ktema warranty end, Meletē exam eve, Philia dates, Oikonomia bills | `notices` provider: pure `read(ctx)` over synced records for `[now, until]` | Yes |
| Reminders the person asked for | Item reminders (lead minutes), calendar and schedule leads, check-backs, look-backs, bell, the day look | Proairetos core (`noticesBetween`). These are Proairetos's own records, not another app's. | No: stays native |
| Recurring | Ergon chores, Ktema upkeep, Phyton checks, Dynamis training days, Diaita wind-down and naps, Askesis run days, Philia keep-in-touch | `notices` provider, the app expands its own repeats inside the 14-day window (as Calendar providers expand inside a range) | Yes |
| Rolling interval | Hydros water | Provider reading drinks, work blocks and quiet hours; the "roll forward after delivery" step stays in `notifications.ts` | Yes, last, optional (decision D5) |
| Live and external | Poreia flight status, Phyton frost background check, Praxis study end (running timer) | Their own paths; they depend on network, a worker or timer state, not on synced records | No |
| Informational | Milestones, schedule changes, household invites | `inbox.ts`; delivered only to the notifications page, never to the lock screen or the server | No (later, as an `info` kind if wanted) |
| Must arrive with the app closed | Everything with a time | Unchanged: the provider output feeds `updateReminders`, which writes the existing server rows | No change |

The provider does not decide delivery. It supplies the same moments the pure functions supply today. Closed-app
delivery, catch-up, the inbox and the phone shell stay downstream of `Notice[]`.

## 3. Proposed provider interfaces

No new registry. The existing `providerModules` and `provides` carry it.

```ts
// core/providers/types.ts
export type NoticeLine = {
  ref: RecordRef;          // the record or day it is about (audit and duplicate check; never shown)
  kind: string;            // one of the app's manifest notices.kinds
  key: string;             // byte-identical to today's key; becomes the tag and the server id input
  at: Date;                // when it is shown
  title: string;
  body: string;
  open: string;            // inside the owning app, same addresses as today
};
// OutputOf<'notices'> = NoticeLine[]
```

`NoticeLine` converts to `Notice` by dropping `ref`, so nothing downstream changes.

- **`enforceNotices(app, lines, range)`** in `policy.ts`: only keys of a line; `ref.app` is the app; `kind` is in the
  manifest's `notices.kinds`; `key` is non-empty, unique, and its source (`sourceOf`, from the kind) is the app's
  `notices.source`; `at` is a real date inside `[now, until]`; `open` starts with the app's `urls.href` or is one of the
  app's existing bare addresses that `placeFor` resolves (`ergon`, `diaita:worry`); words are text within the lengths
  `wordsOf` already caps (120 and 300). Anything else is rejected and reported, not passed on.
- **`mayProvideNotices(app, provider)`**: the manifest lists `notices` in `provides`; the app is not retired; the
  manifest has a notices field classification (section 4); class `shared` is refused. Notices are the person's own
  surfaces, so the class is `own-search`, as for Home and Calendar (the name is existing vocabulary: the person's own
  device and account).
- **`noticeLines(providers, manifest, ctx)`** in `host.ts`: same shape as `calendarLines`. For each provider: refuse
  by manifest, skip unless `ctx.isUsable(app)` (added, trial or bought) **and** the app's notices switch is on
  (a `switchOn(app)` member on the host context, supplied from `NoticeSettings`, not a new stored setting), read,
  enforce, collect timings and rejections. Across apps it drops a repeat of a key (first wins, the repeat is reported).
- **`ProviderContext`** gains two optional members, both already available on the device and read only:
  `blocks?(from, until)` (own schedule plus counting other calendars, what `familyNotices` builds today as `blocks()`)
  and `settings` stays `setting(key)`. `now` and `range` already exist (`range` carries `[now, until]`).
- **Adapter** `src/app/providers/notices.ts`: `providerNotices(now, until, settings)` loads the provider modules of
  added apps whose switch is on, builds the host context, calls `noticeLines`, and returns `Notice[]`. It replaces
  `familyNotices` and the Askesis, Oikonomia and Hydros lines in `upcoming.ts`. `noticesBetween` and `pursuitNotices`
  are unchanged.
- **Subscribe / invalidation:** the existing `subscribe?` on `Provider` is not used in this slice. A refresh already
  re-derives everything on a debounce, and each derivation is cheap (section 8). A per-app cache can be added later by
  the same `sourceChanged` mechanism Calendar uses, if timing shows a need.

### What is supported now and what is new

| Piece | Status |
| --- | --- |
| Pure per-app notice functions, tests, keys, kinds, sources, switches | Supported |
| Manifest `notices` block, `Capability 'notices'` | Supported (declared, unused) |
| Host pattern, enforcement pattern, provider module loading, parity method | Supported (from Home and Calendar) |
| `NoticeLine`, `enforceNotices`, `mayProvideNotices`, `noticeLines` | New |
| Manifest `notices.fields` classification and `provides: ['notices']` per app | New |
| `ctx.blocks` | New (small) |
| One provider file per app wrapping its existing core function | New |
| Adapter replacing `familyNotices` | New |
| Delivery, server rows, sealing, worker, inbox, quiet hours, permissions | Unchanged |

## 4. Manifest and privacy classifications

### The manifest addition

```ts
notices: {
  ...existing keys,
  /** What a notice from this app may state (`shows`), may state only with "Details on the lock screen" (`detailsOnly`),
      and never does (`excludes`). A field in none of them is rejected by a test, not passed through. */
  fields?: { shows: readonly string[]; detailsOnly: readonly string[]; excludes: readonly string[] };
}
```

The enforced part is structural (section 3). Field names cannot be checked inside a string, so the guarantee for the
words comes from two things: the provider is a thin wrapper over the existing core function, which reads only the
fields below, and **canary tests** (section 11) put a unique marker in every excluded field and assert it never
appears in a provider line, a `Notice`, the cache entry, the sealed-words input, the preview columns or the native
schedule payload. The manifest list is what that test iterates, so a new excluded field is covered by adding it.

### Field audit of what notices state today

"Details only" means it is in the words only when the person has turned on Details on the lock screen; otherwise
`privateNotice` replaces the whole notice with the app's name and the time.

| App | May appear (details only) | Sensitive class | Must stay excluded |
| --- | --- | --- | --- |
| Philia | Person's name, the date's label, "turning N", days since last contact | Private family information (names) | Remember lines, gift ideas, who they are, phone, email, photos, times together, notes |
| Ergon | Chore names, a count | Household | Rooms, steps, notes, who it is assigned to, household member ids |
| Ktema | Thing and upkeep names, warranty month | Personal property | Serial number, price, store, notes, manual link, odometer readings, photos and files, insurance values |
| Phyton | Plant names, "check the soil", frost minimum and unit | Location (indirect) | Photos, journal text (pests, notes), the weather place and coordinates, away dates beyond "Back home" |
| Meletē | Subject name, session length, the date's label | Personal | Materials and links, if-then line, hour estimates, rhythm |
| Poreia | Booking title, kind word, start time, plan title and place, trip name, packing count, first thing of the day | Location, travel identifiers | Documents (passport and ID photos, expiry), loyalty numbers, spending, time off, notes, forwarded email, travelers, trip budget |
| Poreia, flagged | **Address** (`booking.address`), **departure place** (`from`), **confirmation code** | Location; identifier | See decision D1 |
| Therapeia | Medicine name and dose **only when the `names` choice is on** (off by default; off shows "A medicine"); visit clinician and place | Health | Notes, questions, readings, health card (allergies, conditions, contacts), supply counts beyond "about N days left" |
| Therapeia, flagged | Visit notices name the clinician and place regardless of the `names` choice | Health | See decision D4 |
| Diaita | Wind-down, nap and caffeine times, planned bedtime | Health-adjacent (sleep) | Sleep log, check-in answers, worry text, light and meals advice, sleep sources |
| Dynamis | Session name, "A training day." | Health-adjacent | Weights, reps, notes, how it felt, mobility records |
| Askesis | Workout title and length, "Run day", the run's place | Health-adjacent, location | Heart rate, GPS distance, log, notes, shoes, Strava, health data brought in |
| Oikonomia | Bill name, **amount**, due wording, "paid automatically" | Financial | Account numbers, notes, balances, pay, statements, plan, envelopes |
| Hydros | "Water", time of the last drink | Health-adjacent | Amounts, caffeine, electrolytes, health data brought in |

Proairetos's own notices (item titles and locations, calendar event titles and locations, decision titles) are the
person's own words and are not provider output. They are unchanged and not classified by the manifest.

### Rules this slice enforces

- A notice never carries a note, a free-text record field, a photo, a file name, a document, a reading, a measurement,
  a balance, an account or card number, a serial number, an identifier of a person other than their given name, or a
  coordinate. Anything in the table's "Must stay excluded" column is tested with a canary.
- `privateNotice` stays the one gate for words. A provider returns full words; the existing code decides whether they are
  shown. The host does not weaken or bypass it, and a test asserts that with details off no provider word reaches the
  cache, the sealed words input or the preview columns.
- The server sees, as now, only the opaque id, the time, the source, the sealed words and (details on) the preview. This
  slice adds nothing the server can read.

## 5. Background delivery architecture

Unchanged, and kept out of the diff:

```
records on device ──(providerNotices)──► Notice[] ──► notifications.refresh
                                                      ├─ store()  → Cache Storage → sw.js (push shows real words)
                                                      ├─ arm()    → timer while open, catchUp on waking
                                                      ├─ phone shell → scheduleNative (soonest 60)
                                                      └─ refreshReminders() → updateReminders
                                                           └─ sourcesToWrite → sealed rows → send-reminders → push
```

- `sourceOf(notice)` still maps kind to source from the manifest, so a provider's lines land in the right source and
  `sourcesToWrite`, `replaceSourceReminders`, the "clears only rows still to come" rule and the preview step-down all
  behave as they do now.
- Because the provider output feeds the same list, a notice produced by the provider path and by the legacy path with the
  same key are the same row. During rollout exactly one path runs (a switch, section 10), so there is no window where both
  write.
- The closed-app guarantee is therefore a parity property, tested by comparing the full `Notice[]` and the derived server
  row inputs (id, time, source, sealed-words input) between the two paths. Server-side behavior is covered by the existing
  `dueRowsKept`, `olderServer`, `sources` and `swRouting` tests, which this slice does not modify.

## 6. Sync and offline behavior

- Providers read the records that sync already puts on the device (`local:` keys, database collections, settings).
  Nothing new is copied, stored or synced. No migration.
- Another device's change arrives by the existing sync, which already triggers `notifications.refreshSoon()` through the
  stores; the next derivation reads the new records. A cross-install test (section 11) writes records the way a pull
  does and asserts the provider yields the same notice a local write would.
- Offline: derivation needs no network. Poreia flight status and Phyton rain/forecast are separate caches and stay as
  they are; the Phyton provider reads the forecast cache the same way its core function does now.
- An app that is not added gives nothing (`isUsable`), and a switch that is off gives nothing, as today. Removing an app
  clears its source on the next refresh, as `sourcesToWrite` already does for apps Proairetos wrote before.

## 7. Duplicate prevention

1. Keys stay byte-identical, so the tag, catch-up's shown list, the worker's shown list and the server id do not change.
2. `enforceNotices` requires a key unique within an app and a kind that maps to the app's own source; `noticeLines` drops
   a key repeated across apps and reports it.
3. One path at a time: the adapter replaces the legacy gather in one place (`upcoming.ts`); a single switch picks which
   runs. The legacy code stays until parity has been shown, then goes in its own commit.
4. A record shown on Today or the calendar may also have a notice; those are different surfaces and different
   mechanisms, as today. Notices and inbox entries share keys, and `arrangeInbox` already keeps one per key.
5. Apps that Proairetos also writes for (`mainWrites`) are unchanged: the writer still replaces one source at a time.

## 8. Performance considerations

- **No new network, database table, background job or persisted index.** Derivation is the same work `familyNotices`
  does now, once per refresh, on the same 800 ms debounce, 14 days ahead.
- **Extra cost:** one dynamic import per added app's provider module on first refresh (these modules also serve Home and
  Calendar, so they are usually loaded already), and a validation pass over the lines (cheap: tens of lines).
- **Startup weight:** `notifications.refresh` already imports `upcoming` lazily; the adapter is imported there, so no
  app's first chunk gains code. The existing first-chunk and speed checks are the guard.
- **Records access:** `ctx.records` reads browser storage by prefix on each call, where the legacy path reads the apps'
  in-memory state modules. Where an app's core function needs many records (Philia people, Ktema things) the provider
  uses the same state module the legacy path uses, unless parity timing says otherwise. Each derivation leaves a
  `provider-derive:notices:<app>` performance mark, as the other capabilities do, so cost is measurable per app.
- No persistent notice index. The first measurement to take, if authorized, is a before and after timing of
  `upcomingNotices` on a seeded device; an index is only proposed if that shows a problem.
- Event-driven: unchanged. The refresh is driven by store changes, sync, visibility and settings. The `subscribe` hook
  stays available for a later per-app cache.

## 9. Exact files expected to change

New:

- `src/app/providers/notices.ts` (adapter)
- `src/<app>/providers/notices.ts` for philia, ergon, ktema, melete, phyton, poreia, therapeia, diaita, dynamis,
  askesis, oikonomia and (optional) hydros
- `src/tests/providers/notices.test.ts` (contract and enforcement), `noticesCanary.test.ts`, `noticesParity.test.ts`,
  `noticesSync.test.ts`
- `scripts/notices-check/` (one representative browser check, only if authorized)
- `docs/PROVIDER_CONTRACT.md` section 8 for notices

Changed:

- `src/core/providers/types.ts`, `policy.ts`, `host.ts`, `index.ts`
- `src/core/apps/manifest.ts` (`provides: ['notices']` and `notices.fields` for each app above)
- `src/app/providers/context.ts` (`blocks`, switch lookup)
- each `src/<app>/providers/index.ts` (add the provider to its list)
- `src/app/notify/upcoming.ts` (call the adapter in place of `familyNotices` and the direct Askesis, Oikonomia,
  Hydros lines; legacy kept under the switch until its removal commit)
- `src/app/notify/familyNotices.ts` (deleted in the last commit only)
- `src/core/notify/notices.ts` (only if `Notice` needs `ref`; the plan keeps `Notice` unchanged)

Not changed: `notifications.ts`, `syncController.ts`, `sources.ts`, `place.ts`, `sw.js`, `send-reminders`, the inbox, any
migration, any per-app `core/notices.ts` (the providers call them), any wording.

## 10. Implementation order (each an independent commit)

0. **Parity harness first.** A test that runs the current `upcomingNotices` over fixed fixtures and records the exact
   `Notice[]` and the derived row inputs. It changes nothing. It is the baseline every later commit must match.
1. **Contract.** `NoticeLine`, `enforceNotices`, `mayProvideNotices`, `noticeLines`, manifest `fields` type, the
   classification test. No provider and no consumer yet. Reversible by revert.
2. **Context and adapter.** `ctx.blocks`, the adapter, the path switch (legacy by default). Still no output change.
3. **Pure-record apps:** Philia, Ergon, Ktema, Meletē.
4. **Privacy-heavy apps:** Phyton, Poreia, Therapeia (canary coverage is the point of this commit).
5. **Schedule-dependent app:** Diaita (needs `blocks`; Therapeia's anchors already use it).
6. **Cross-app and direct paths:** Dynamis, Askesis runs (shared training week), Oikonomia bills, and optionally Hydros.
7. **Switch the default to the provider path** after parity, canary and sync tests pass. Legacy still present.
8. **Remove the legacy gather** (`familyNotices.ts` and the direct lines) in its own commit, only after review.

Rollback at any step: revert that commit. After step 7 and before 8, setting the path switch back restores the legacy
gather with no release.

## 11. Test plan (nothing is run until you approve it)

Estimates for time come from earlier runs in this session where I have them; where I do not, I say so.

| Group | What it proves | Command | Count | Estimated time |
| --- | --- | --- | --- | --- |
| **Essential: contract and enforcement** | Unknown keys, wrong app, wrong kind or source, key repeats, bad times, `open` outside the app, unclassified app, `shared` class are all rejected | `npx vitest run src/tests/providers/notices.test.ts` | 1 | a few seconds |
| **Essential: privacy canaries** | A unique marker in every excluded field above (booking notes and documents, medicine notes, health card, serial number, bill notes and account, chore notes, person remember lines, plant journal, subject materials) never appears in a provider line, `Notice`, cache entry, sealed-words input, preview columns or native payload; with details off no provider word reaches any of them | `npx vitest run src/tests/providers/noticesCanary.test.ts` | 1 | a few seconds |
| **Essential: parity** | The provider path returns the same `Notice[]` as the legacy path (key, kind, time, title, body, open) and the same server row inputs, for fixtures covering each app, every switch combination, names on and off, details on and off | same file run under `TZ=UTC` and `TZ=America/Los_Angeles` | 2 | a few seconds each |
| **Background delivery** | Existing: due rows kept, older server step-down, sources, worker routing. No new test is needed because the provider output feeds the same code; these confirm it still does | `npx vitest run src/tests/notify` | 1 | a few seconds (the folder holds 7 files; not timed this session) |
| **Cross-install sync** | Records written the way a pull writes them yield the same notices as local writes; an app removed or a switch turned off clears its source | `npx vitest run src/tests/providers/noticesSync.test.ts` | 1 | a few seconds |
| **Types and lint** | Compiles and lints | `npx tsc --noEmit` and `npx oxlint` | 2 | about 10 to 20 s each (not timed this session) |
| **Representative browser** | One real page: a seeded Philia, Therapeia and Poreia device with details on then off, permission granted; notices appear once, in the right app's name, with the right words, opening the right record; nothing duplicates after a refresh | build once, then `scripts/notices-check` | 1 build, 1 run | build about 6 s; run about 45 s to 60 s |
| **Optional: full regression** | Nothing else moved | `npm run check` | 1 | several minutes, not timed this session |

Recommended minimum before commit 7: the first six rows and types and lint. The browser check is recommended once, at
commit 7. The full suite is optional and I will not run it unless you ask or a specific failure needs it.

Each commit above would be checked with only the tests it touches (for example commit 3: the canary and parity files
for those four apps), so per-commit usage stays small.

## 12. Risks, compatibility and rollback

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| A key or time differs by one character | A second server row and a second notification | Step 0 baseline and parity test compare every field |
| Quiet-hours and "not held" rules differ between kinds (Therapeia doses, Diaita and Poreia are not held) | A notice moves | The provider calls the same core functions, which carry those rules; parity covers them |
| Time zone and clock-change differences | A reminder shifts an hour | Parity in UTC and Los Angeles; CI already runs two other zones |
| A provider for an app that is not added or whose switch is off still runs | Notices for an app the person removed | `noticeLines` checks both; a test asserts it, including the household and trial paths of `isUsable` |
| Training week fit is read synchronously from a device cache | Dynamis and Askesis times differ from today | Same cache functions as now (`liftDays`, `trainingTimeOn`, `fitAhead`); these two go in a later commit so the first commits carry no such dependency |
| Wording drifts | The owner's wording rules | No text is changed; the language guard still scans every source file |
| Preview columns hold plain words with details on | Pre-existing; any app added later inherits it | Decision D3; documented in the field table |
| `ctx.blocks` merges device-only calendars | Another calendar's event could reach a provider | It supplies start, end, kind and label only, as `familyNotices` passes today; the canary covers an other-calendar title |

Compatibility: no data format, migration, server object, worker or manifest of an installed app changes. Older devices
keep running the legacy path until the switch is on, and the output is the same either way.

## 13. Open decisions for you

- **D1. Poreia confirmation code, address and departure place in a notice.** Today they appear in the words when
  Details on the lock screen is on ("Confirmation ABC123"). The calendar excludes them. Recommendation: keep them for
  this slice (they are the point of a check-in reminder, they are sealed in transit and shown only on your choice),
  classify them `detailsOnly`, and revisit with D3. Alternative: remove them from notices, a visible change.
- **D2. Oikonomia bill amount in the notice title** ("Rent · $1,200.00"). Calendar and search exclude amounts. Same
  recommendation: keep for this slice, classify `detailsOnly`. Alternative: name only.
- **D3. Plain preview columns on the server with details on.** Option A (recommended for this slice): leave as is and
  state it in the field audit and Privacy at a glance if not already there. Option B: send preview only for kinds with
  no `detailsOnly` field. B changes what an iPhone's own push shows for doses, bills and trips, so I will not do it
  without your say.
- **D4. Therapeia visit notices name the clinician and place whatever the `names` choice says.** Doses respect it.
  Recommendation: keep, then ask whether `names` should cover visits as a separate small change after this slice.
- **D5. Scope.** Recommended in: Philia, Ergon, Ktema, Meletē, Phyton, Poreia, Therapeia, Diaita, Dynamis, Askesis runs,
  Oikonomia bills. Hydros as a last, optional commit (its rolling schedule and re-roll after delivery stay in
  `notifications.ts`). Out: Praxis study end (running timer state), Poreia flight status, Phyton frost background check,
  milestones and schedule changes, household invites.
- **D6. Gate.** Recommended: only the existing `NoticeSettings` switches; no new `proairetos.providers` switch for
  notices, because that would be a second way to turn the same thing off.
- **D7. `ctx.blocks`.** Recommended: add it, read only, start, end, kind and label. Alternative: Diaita and Therapeia
  stay on the legacy gather and only the pure-record apps move.

## 14. Health data on the roadmap (not in this slice)

Health data the person brings in (Apple Health through Health Auto Export, Health Connect on Android) already lands as
ordinary records in Askesis (workouts), Diaita (nights), Hydros (water) and Therapeia (readings) through `applyHealth`
in `app/health/health.ts`. It therefore needs no path of its own into the provider architecture. Where it connects later:

- **Notices:** nothing from readings or measurements ever enters a notice (the Therapeia and Hydros rows above exclude
  them). If a notice about brought-in data is wanted (for example "3 workouts brought in"), it is an informational
  `info` line in the notifications page, not a lock-screen notice.
- **Privacy class:** add a `health` marker to the manifest field classification so the canary test covers readings,
  heart rate, sleep stages and the health inbox keys across search, calendar, Home and notices at once.
- **Library (Slice 6):** health-sourced records appear through each owning app's library provider, with the `health`
  marker excluding raw values.
- **Home:** Daily practices already reads brought-in workouts, nights and water through the home providers. A future
  health summary would be a new `home` row kind under the same `enforceHome` rules.
- **Source of truth:** the owning app's records stay the source; the health inbox remains device-sealed and is not read
  by any provider.

## 15. Next step

Review sections 4, 13 and 11. On approval of the decisions (D1 to D7) and the test list, I would start with commit 0
(the parity baseline), which changes no behavior and is the one that makes every later step checkable.
