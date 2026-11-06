# Provider contract (design only)

Status: approved design (docs/PHASE3_PLAN.md). Slices 1 and 2 are built: the provider types, host and policy, and search
providers for Soma, Theoria, Philia, Ergon, Therapeia, Ktema, Poreia, Askesis, Dynamis, Oikonomia and Hydros. Slice 3 is
built: home providers for the 14 apps that put lines on Today (section 6). Slice 4 (calendar) is built except the presentation of kinds (section 7). Notices and library providers do not
exist yet. Section 4 below was revised by the owner's decision D1. It builds on the application manifest (`src/core/apps/manifest.ts`, `docs/APP_REGISTRY.md`) and the
existing read-only `LifeRecordAdapter` (`docs/LIFE_RECORD_INTEGRATION.md`).

The core rule stays: the system records life; it does not interpret life. A provider shows what an app already
holds, in the person's own words and numbers, and never ranks, scores or advises.

## 1. Capabilities

An app may offer any of these to Proairetos. Each is read only, runs on the device, and is switched on by the
person (an app that is not added offers nothing).

| Capability | What it gives | Existing precedent |
| --- | --- | --- |
| `library` | Entries for Reflect's Library (title, day, a plain line) | `LifeRecordAdapter` |
| `search` | Result rows for universal search (title, day, kind, where it opens) | search over added apps |
| `calendar` | Dated lines for Days ahead | `bill-dates`, `ktema-dates`, `study-dates` |
| `notices` | Times and words for reminders | `familyNotices`, reminder sources |
| `home` | Rows for Today's groups | `fromAppsRows`, `TodayAppsOverview` |

The manifest already carries what a provider declares: `notices`, `today`, `search`, `declares`. A provider entry
adds `provides: ('library' | 'search' | 'calendar' | 'notices' | 'home')[]` and a version. `declares` stays a statement
for people and tests, not enforcement.

## 2. Privacy classes

| Class | Meaning |
| --- | --- |
| `private` | Never leaves the owning app. No projection, no index, no other app reads it. |
| `own-search` | A minimal, encrypted search projection may sync so the person can search their own records from Proairetos. The underlying record is not reachable by any other app. |
| `shared` | Explicitly authorized by the person, with the permission shown (households, shared lists). |

Every capability field a provider returns carries a class. A field with no class is `private`.

## 3. Search rules for two apps

**Oikonomia** (`own-search`). May index: bill name, payee, due date, paid or unpaid. Must not index or display:
account numbers, balances, statement lines, financial notes, transaction details, bill amounts. A result opens
inside Oikonomia (`/oikonomia/?open=bill:ID`). The manifest records both lists (`indexes`, `excludes`), and the
validator requires `excludes` on any app that indexes.

**Hydros** (`own-search`). May index named drink types and day-level summaries inside a rolling 30-day window
(`windowDays: 30`). Individual drinks beyond the window are not indexed. Private to the account; no other app reads it.

## 4. Search across independently installed apps (revised, D1 and D6)

Server-side search is not possible: the server holds only sealed records, and plaintext indexing would break
end-to-end encryption. There is also **no synced projections collection and no persisted index**. Encrypted sync
already carries every app's records to each signed-in install, so each install derives search results from the records
it holds.

- **Derive on the device.** A provider (`src/core/providers/`) is a pure function from the app's local records to
  search rows. Rows are built when search opens and kept only in memory (`app/providers/cache.ts`).
- **Sync.** The source records sync as they always have (sealed, per collection). Nothing new is stored on the server
  and no migration is needed. The sync engine now reports which collections a pull changed
  (`onChangedCollections`), so a cached result is dropped only when something it reads changed.
- **Offline.** Providers read the install's own copy. Search needs no connection.
- **Deletion.** Deleting a record removes it through sync (a tombstone); the next derivation no longer has it.
- **Revocation.** The person's switch per app and capability (`proairetos.providers`, synced, What's included > Apps in
  search) removes that app's results at once. An app that is not added, or not usable under the Store, provides nothing.
- **Versioning.** A provider has a `version`; its cached result is rebuilt whenever it changes.
- **Permission enforcement** is in the host (`policy.ts`), not in each provider: the manifest's `search.indexes` are the
  only field names a result may carry, `search.excludes` never appear, unknown fields and titles are rejected, a rolling
  `windowDays` is enforced on the host as well as by the provider, and only the `own-search` class reaches universal
  search (`private` never leaves its app; `shared` is not built).
- **Measure before persisting.** A persisted sealed index, or a synced projections collection, is considered only if
  measured performance needs it.

Search rules as built:

- **Oikonomia** (`own-search`): bill name (the payee), due date, paid status. Never amounts, account numbers, balances,
  statement lines, notes or transaction details. A result opens that bill. Notes were indexed before Slice 1 and no longer are.
- **Hydros** (`own-search`, off until turned on): named drinks and day summaries inside a rolling 30-day window.
  No individual drinks, times, caffeine, sugar, electrolytes or daily amount.
- **Other apps** (D4, Slice 2):
  - Therapeia: medicine name, visit contact, visit place. Not doses, medicine or visit notes, questions, the health card or readings.
  - Philia: name, who they are, remember lines, gift ideas, times together. Not phone, email or dates.
  - Ergon: chore name and room. Not the note, who it is given to, or its steps.
  - Ktema: names, make and model, place, the person's notes. Not serial numbers, prices or warranty details.
  - Poreia: trip, booking and plan names, places, providers, addresses, notes. Not confirmation codes, travel documents, spending or loyalty numbers.
  - Soma: recipe title, ingredients, notes, tags. Askesis: title, notes, what went well, next time, intention. Dynamis: session title and note. Theoria: title, author, highlights, reading notes.
  - Phyton, Meletē, Mneme, Diaita and the retired Praxis are `private`: nothing of theirs is searched until the owner classifies fields.
  - A field that is not in the manifest's `indexes` is rejected, so an app that is not classified is not searched at all.

## 5. Compatibility

Providers are additive. An app with no `provides` behaves as it does today. The manifest validator will gain
checks (a `search` capability needs a privacy class and `excludes`; a `private` field is never in a projection).

## 6. Home providers (Slice 3)

Today's two groups, Daily practices and Worth your attention, read only providers. The old per-app code
(`FromYourApps`, `fromApps`, `TodayNewFamily`) is gone; Compass pursuits stay Proairetos's own.

- **Manifest.** An app that provides `home` declares `home: { shows, excludes }` and a `today.group`. The check in
  `validate.ts` refuses `provides home` without both. The privacy class of a home provider is `own-search`: lines are
  for the person's own screen, never `private` or `shared`.
- **Row.** `HomeRow` has only `ref`, `group`, `title`, `detail`, `open`, `icon`, `progress`, `swipe` and `notForMe`.
  `enforceHome` rejects an extra key, another app's ref, a group other than the manifest's, an `open` outside the app's
  address or containing `//`, a bad icon or progress, a pull with no id, and duplicates. A rejected result is dropped
  and reported; the other apps' lines stay.
- **Marks.** A provider may offer `act(ref, today)`, which does the mark and returns an undo. `markHomeRow` calls it
  through the store; the provider is the only place that writes, and only on the person's pull.
- **Warm and age.** `warm()` loads what a derivation needs but cannot fetch at read time (Askesis and Dynamis fit the
  training week). `maxAgeMs` shortens the five-minute default for time-bound apps (Therapeia, Poreia, Meletē: 60 s).
- **Sources.** `invalidate.ts` adds `device:<name>` for device-only caches (the weather and frost cache, the
  training-week fit). A `device:` source is never synced.
- **Store.** `app/providers/homeStore.ts` holds each app's lines in memory. An app derives only when it is added and
  usable, and not set aside in Apps on Today. It derives again only when a sync changes one of its sources, its own
  records change on this device (`watchLocal`), the person's day turns over, or its lines pass their age limit.
  Nothing derives while Today has no reader. Nothing is stored or synced, and each derivation leaves a
  `provider-derive:home:<app>` performance mark.
- **Parity.** `scripts/home-check/` (`npm run home:check`) seeds one record in every contributing app on a fixed clock
  and compares text, markup and pictures against the pre-migration build (`compare.mjs`), in UTC and Los Angeles.
- **Doses.** Therapeia's Home lines carry the medicine name and the dose time, never the amount of a dose. The manifest
  lists `dose amounts` under `excludes`, and a canary test puts a dose in every field a record has and checks the whole
  serialized line. The baselines in `scripts/home-check/baseline/` were edited for this one change (`8:00 PM · 50 mg`
  became `8:00 PM`); nothing else in them moved.
- **Coverage.** `syncHomeApps.test.ts` runs one table over all 14 providers on two installs and a stand-in server:
  creation, edit, deletion, an offline install, excluded fields (canaries, and no plain text on the server) and an app
  set aside (never asked). `scripts/home-check/behaviors.mjs` covers the browser scenarios once, on representative apps.
- **Layout.** This change touches a text string inside an existing line and no markup or style, so the parity compare
  (390 and 1440, dark and light, UTC and Los Angeles) is the layout check; `layout-check` and `visual-check` measure
  docks and bars, which nothing here changed.

## 7. Calendar providers (Slice 4)

Days ahead, Today's timeline and open time read the apps' calendar providers through `app/providers/calendarStore.ts`.
Six apps contribute: Philia, Oikonomia, Ktema, Meletē, Therapeia and Poreia. Others do not, and none was added.

- **Manifest.** An app that provides `calendar` declares `calendar: { shows, excludes, kinds }`; the check refuses
  `provides calendar` without all three. Lines show while the app is added.
- **Line.** `CalendarLine` has only `ref`, `kind`, `title`, `detail`, `open`, `day`, `until`, `start`, `end`, `location`,
  `done` and `color`. `kind` is `event` (a time on the clock), `deadline` (a day something is due or ends), `recurring`
  (a date that comes round: birthdays, anniversaries) or `info` (a span of days, or a one-time date, that gives context).
  `enforceCalendar` rejects any other key, another app's ref, a kind the manifest does not list, an `open` outside the
  app, a bad day, a span that does not end after it starts, an event without a valid time, a time on any other kind, and a
  record twice (ref and day). A line outside the visible range is dropped.
- **Days and spans.** A day is the person's local calendar day, `YYYY-MM-DD`, so a date with no time is that day in every
  time zone. `until` is the day after the last day (end-exclusive). Only an `event` has instants.
- **Ownership.** `ref` is `app:kind:id[:occurrence]` (the occurrence is the day, for a date that comes round); `open`
  stays inside the owning app. Nothing is copied into Proairetos.
- **Range.** The reader gives the visible range (`ctx.range`, `until` exclusive). A provider expands what repeats inside it
  and not beyond (`rangeDays`).
- **Store.** Results are held in memory per app and range (six ranges at most). An app is asked again only when its sources
  change in a sync, its own records change (`subscribe`), the day turns over, the age limit passes, or it is added or
  removed. Once the calendar is being read the store keeps watching, so moving between Today and Days ahead reuses what it
  holds. Each derivation leaves a `provider-derive:calendar:<app>` mark. Nothing is stored or synced.
- **Amounts.** Oikonomia's lines give the bill's name, due date and whether a payment is recorded. Amounts, currency,
  payments, notes and bill types are excluded (the owner's decision). The baselines in `scripts/calendar-check/baseline/`
  were edited for this one change.
- **The published calendar.** The file people subscribe to still carries Poreia's events as before, with their notes and
  confirmation codes (the person's own file). It reads through `app/calendars/poreiaFeed.ts`, not through the provider.
- **Readers.** `eventsFromLines` and `quietLinesByDay` (`app/providers/calendarView.ts`) make the shapes the screens
  draw. `busyTime.ts` takes only Philia, Therapeia and Meletē entries as busy time, as before.
- **Parity.** `scripts/calendar-check/` (`npm run calendar:check`) seeds one record of every kind in the six apps on a fixed
  clock and compares Days ahead (list, week, month, year) and Today's timeline against the pre-migration build.
