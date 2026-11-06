# Phase 3, Slice 6: the Library through providers

Status: revised plan (revision 2) for approval. The decisions D1 to D4 are recorded in section 6. The code was read to verify the
findings in section 2; nothing was changed, built, tested or run. Points still to confirm by reading are marked **verify**.

## 1. What exists

Reflect's Library is a read-only view across the family. Nine pure adapters (`LifeRecordAdapter`, `src/core/life-records/index.ts`)
project records into one shape, `LifeRecord`: a stable `key`, a `kind` (reflection, decision, pursuit, life, workout, meal, study, note,
idea, trip, financial), the source app and id, a time, a title, optional detail and body, search text, connected value ids and an
archive flag. One page, `ConnectionsPage.tsx` (851 lines), is the only consumer: it gathers every input with hooks and calls
`buildLifeRecords` in one `useMemo`.

Library-owned state is the Library's and stays so: saved items (`proairetos.libraryFavorite:`), Recently Deleted
(`proairetos.libraryTrash:`, 30 days, tombstones by record key) and value connections (`proairetos.libraryValueConnection:`). These are
ordinary `proairetos.` settings, so they sync and back up like any setting.

Already built and reusable: the contract and validator, stable keys (`lifeRecordKey`) that favorites and trash markers depend on, the
provider host and its enforcement pattern, in-memory per-app stores with invalidation (`homeStore`, `calendarStore`), `isAdded`
gating, `Capability 'library'` in the manifest, and the parity method used for Home, Calendar and notices.

## 2. Verified findings

**F1. How the Library gathers records.**

- The page reads, with hooks: reflections, decisions, life items, Compass values and pursuits (Proairetos's own services); Askesis
  runs (`useRuns`, from the shared database); Dynamis workouts and its plan unit (`dynamisWorkouts`, `dynamisPlan`, browser storage);
  Soma recipes (`useRecipesFromSoma`, shared database); study sessions (`useStudy`, Proairetos's items with `app: 'praxis'`, so Theoria);
  Mneme notes and ideas (`mnemeNotes`, `mnemeIdeas`); Poreia trips and journal; Oikonomia's Reflect milestones
  (`oikonomia:reflect-milestone:`).
- Each hook keeps itself current (the app's own `.use()`, `onRemoteChanges`, coming back into view). Everything is recomputed in memory
  when any input changes. Nothing derived is stored or synced today, and that stays true.
- `buildLifeRecords` is called only by this page; `trash.ts` and `LibraryRecordItem.tsx` use the types.
- **The selection rules are already inside the adapters**: Mneme notes are projected only when `inReflect ?? pinned`, Mneme ideas only
  when `inReflect === true`, Oikonomia milestones only when `inReflect`. Wrapping the adapters unchanged keeps D2 by itself.

**F2. How the lock works, including non-reflection entries.**

- The lock is an optional device passcode (`app/lock/lock.ts`), device only, locking again after a minute out of sight. It guards
  *routes*: `lockedRoutes` = reflect, journal, insights, review.
- `App.tsx` renders the Library only when `!locked` (`route === 'connections' && !locked`). `connections` is not in `lockedRoutes`, so while
  locked that route shows nothing (not even the lock screen). The result is that **while the lock is on, the whole Library is out of
  sight, every kind and every app's records, not only reflections.** The lock is page-level, not per-kind.
- Search is different: while locked it leaves out reflections only (`SearchSheet`); other kinds come through search's own
  classification. That is unchanged by this slice.
- Consequence for the design: the Library host is called only from the mounted page. While locked, no provider runs and nothing is
  derived. A test will assert that; no lock logic is added or changed. The blank screen on `connections` while locked is existing
  behavior and is only reported here.

**F3. Ownership and deletion.**

- "Remove from Reflect" writes a Library-owned tombstone (`libraryTrash`); it never touches the source record (the page's own confirmation
  says so). "Permanently remove" marks the tombstone `deletedAt`; unexpired rows expire to tombstones after 30 days. A record
  deleted in its own app simply leaves the list; its tombstone, favorite and value connection remain until cleared.
- Archive, restore, connect a value and edit a body act through Proairetos's own services, for Proairetos-owned kinds only
  (`canArchiveLifeRecord`: reflection, decision, pursuit, life).
- **One write to a companion app exists today:** archiving a Mneme note puts `archived` on the note (`mnemeNotes.put` in the page). That is
  the only place the Library writes into another app's record. This slice leaves it where it is (decision D5), and a provider never writes.
- Navigation keeps the owning app: `hrefFor` in `LibraryRecordItem.tsx` maps (kind, app) to a deep link into the source app
  (Askesis `entry:ID`, Dynamis `workout:ID`, Soma `recipe:ID`, Theoria Pomodoro sessions, Mneme `note:ID`, Poreia `trip:ID` or journal,
  Oikonomia More). This is unchanged; a test will hold every companion record to an address inside its own app.

**F4. When an app is disabled or removed.**

- **Today the Library does not check the Store.** The page reads Askesis, Dynamis, Soma, Theoria, Mneme, Poreia and Oikonomia records
  whether or not the app is added. A person who removed Askesis still sees its runs in Reflect.
- With D1, a removed app's records leave the Library. `isAdded` is "added and usable", so it also covers an expired trial or an app not
  bought: those records leave too and return when the app is added or bought. Nothing is deleted (the records are kept in their
  app). This is a visible change for those people and is listed as a consequence in section 6.
- Library-owned state for a hidden record (a favorite, a value connection, a Recently Deleted row) stays and applies again when the record
  returns; trash expiry continues by time. The source-app filter lists only apps that have visible records, so a removed app disappears from it.
- Retired Praxis follows Theoria (`isAdded('praxis')` is `isAdded('theoria')`).

**F5. Packaging for iOS and Android.**

- The phone apps are the same web bundle in a native web view (`docs/NATIVE.md`: one app holds the family; `dist-native`; web-first, native
  features additive behind `isNativeApp()`). Providers are pure TypeScript that read the device's own storage; they use no network, no
  native bridge and no permission, so they are compatible with the packaged apps and need no native code.
- Because nothing derived is stored, a packaged app and the website cannot differ by a stale projection.
- **Not done in the shell: widgets.** A home-screen widget would need a projection exported to the system, which means storing a derived
  copy. That conflicts with this slice's rule and would be a separate, explicitly approved decision.

**F6. Privacy of the data the Library shows.** The Library already shows what the person wrote (notes, ideas, trip journal, reflections)
and workout detail (exercise, sets, reps, weight, notes). The adapters build these fields: Dynamis detail and body (exercises, sets, reps,
weight, duration, note), Askesis detail and body (distance and time in the person's unit, notes, went well, next time, intention), Soma
(who it was cooked for, notes; tags, ingredients and source only as search terms), Theoria (minutes, reading or study), Mneme (title,
body, source, kind, transcript text as search terms), Poreia (trip name, places, dates; journal text and place), Oikonomia (title, body of
a milestone). The classification in section 4 names exactly this and nothing more.

## 3. The design

The input gathering moves out of the page; each companion app projects its own records through a `library` provider that wraps its
existing adapter unchanged. Proairetos's own records (reflections, decisions, pursuits, life items) stay native, on its own services.

- `mayProvideLibrary(app, provider)`: the manifest lists `library`; the app has a `library` classification; class `shared` is refused.
- `enforceLibrary(app, records)`: only the keys of a `LifeRecord`; `sourceApp` and `source` are the app's own; `kind` is one the manifest
  lists for the app; `key` is unique and follows `app:kind:id[:occurrence]` (existing keys are kept as they are); `at` is a valid date-time;
  text fields are strings; `archived` is a boolean; anything else is dropped and reported.
- `libraryRecords(providers, manifest, ctx)` in the host: asks only apps that are added and usable (D1). Reads the app's own records through
  the context; never writes; never receives another app's records.
- `app/providers/libraryStore.ts`: in-memory only, per app, modeled on `homeStore`. A result is dropped when the app's own records change on
  this device, when sync brings changes to what the app reads, when the day turns over, and after an age limit. **Nothing is written to
  localStorage, IndexedDB, a cache or sync, and nothing is held after the page is left or the app reloads.** Not persisted, not synced,
  not a second copy.
- `useLibraryRecords()`: a hook the page uses for companion records, in place of the seven hooks; the page merges them with the native
  records and carries on as before (`mergeLibraryValueConnections`, favorites, trash, grouping).
- Manifest `library: { kinds, shows, excludes }` per app (section 4).
- The Mneme archive write stays in the page (D5); `hrefFor` stays in `LibraryRecordItem.tsx` (F3).

## 4. Classification

What an entry may state, enforced as structure (own app, listed kinds, listed keys) and held by canary tests for the "never" column.

| App | Kinds | May appear | Never |
| --- | --- | --- | --- |
| Askesis | workout | Title, date, activity, distance and time in the person's unit, notes, went well, next time, intention | Heart rate samples, GPS points, health data brought in, shoes, Strava tokens |
| Dynamis | workout | Session, date, exercises, sets, reps, weights, duration, note (D3) | Health data brought in, mobility records |
| Soma | meal | Recipe title, cooked day, who it was cooked for, notes; tags, ingredients and source only as search terms | Nutrition grade, shopping lists, the pantry |
| Theoria | study | Book or study block, day, minutes, reading or study | Book files, highlights, notes in books |
| Mneme | note, idea | Only what the person chose for Reflect (`inReflect ?? pinned`, `inReflect`): title, body, source, kind; transcript text as search terms | Notes and ideas not chosen, voice recordings |
| Poreia | trip | Completed trips (name, places, dates) and their journal entries | Upcoming trips, bookings, confirmation codes, addresses, documents, spending, time off |
| Oikonomia | financial | Milestones the person wrote and chose (`inReflect`): title and body | Bills, amounts of bills, balances, envelopes, statements, transaction lines, pay |

Excluded entirely (D4): Hydros, Philia, Therapeia, Ktema, Phyton, Meletē, Ergon, Diaita, and every app not listed.

## 5. Preserving behavior

- Record keys, order, titles, detail, body, search text, value ids and archive flags are held byte for byte by a snapshot of the page's
  record list built from fixtures for the seven companion sources (UTC and Los Angeles). Favorites and Recently Deleted keep working because
  keys do not change.
- Favorites, trash, value connections, bulk archive, edit-a-reflection and the Mneme archive are untouched.
- The lock behaves as today (F2). Offline: providers read the device's copy only.
- The one deliberate change is D1: a removed, expired-trial or unbought app's records are not listed.

## 6. Decisions

- **D1 (decided).** Removed apps' records leave the Library. Consequence to acknowledge: this includes an app whose trial ended or that
  is not bought (`isAdded` means added and usable). The records are kept in the app and return when it is added or bought.
- **D2 (decided).** Mneme and Oikonomia keep control of what enters Reflect: the existing adapters and their `inReflect` filters move
  into the providers unchanged.
- **D3 (decided).** Weights, distances and notes in Dynamis and Askesis entries stay as displayed.
- **D4 (decided).** Hydros, Philia, Therapeia, Ktema, Phyton, Meletē, Ergon and Diaita stay out.
- **D5 (proposed).** The Mneme note archive stays a write in the page, as today. Moving it behind a provider action (as Home has one)
  can be a later, separate change. Recommendation: leave it.
- **D6 (proposed).** Widgets or any exported projection are out of this slice (F5).

## 7. Implementation order (independently reversible commits)

0. **Baseline.** A test that builds the page's record list from fixtures for the seven companion sources and records every field, in UTC
   and Los Angeles (`src/tests/life-records/baseline.test.ts`, files in `src/tests/life-records/fixtures/`). No behavior change.
1. **Contract.** `mayProvideLibrary`, `enforceLibrary`, `libraryRecords`, the manifest `library` type, a classification test. No app, no consumer.
2. **Store and adapter.** `libraryStore.ts`, `useLibraryRecords`, a device switch and a build variable (legacy default). Tests: nothing
   written to storage; nothing derived while locked; invalidation.
3. **Apps one at a time**, each with parity and canaries: Askesis, Dynamis, Soma; then Theoria and Mneme; then Poreia and Oikonomia.
4. **Page.** `ConnectionsPage` takes companion records from `useLibraryRecords`. Parity page by page, then the default switches; the old
   hooks stay for rollback.
5. **Remove the old gathering** in its own commit, after review and a period on the default.

## 8. Files expected to change

New: `src/app/providers/libraryStore.ts`, `src/app/providers/libraryPath.ts`, `src/app/providers/useLibraryRecords.ts`,
`src/<app>/providers/library.ts` for askesis, dynamis, soma, theoria, mneme, poreia and oikonomia,
`src/tests/life-records/{baseline,parity,canary,store,lock}.test.ts` and fixtures, `scripts/library-check/` (one real-page check).

Changed: `src/core/providers/{types,policy,host,index}.ts`, `src/core/apps/manifest.ts` (`provides: ['library']` and `library`),
each `src/<app>/providers/index.ts`, `src/app/providers/context.ts` (if needed), `src/features/connections/ConnectionsPage.tsx`
(commit 4 only), `docs/PROVIDER_CONTRACT.md`, `docs/LIFE_RECORD_INTEGRATION.md`.

Not changed: the adapters' output, `LifeRecord`, `lifeRecordKey`, favorites, trash, value connections, the lock, `hrefFor`, any
migration, any server code, the notification identity migration (K2 stays closed) and Commit 8.

## 9. Rollback

- Each commit is independent and reversible by revert; nothing stored or migrated changes.
- Until commit 5, the old gathering stays in the page. A device sets `proairetosLibraryProviders` to `off` (device only, outside the
  `proairetos.` prefix), or a build sets `VITE_LIBRARY_PROVIDERS=off`, to go back without a code change.
- Library-owned state is never touched, so going back loses nothing; a record hidden by D1 reappears the moment the old gathering is used.

## 10. Targeted tests (proposed; none run)

| Group | What it proves | Command | Time |
| --- | --- | --- | --- |
| Baseline and parity | The provider list equals the page's list field for field, in UTC and Los Angeles | `TZ=… npx vitest run src/tests/life-records` | a few seconds each |
| Contract and enforcement | Unknown keys, another app's records, an unlisted kind, a repeated key, a bad time are dropped | the same folder | seconds |
| Privacy canaries | A marker in every "never" field is in no record, search text or body | the same folder | seconds |
| Lock | While locked, no provider runs and nothing is derived; unlocking lists the same records | the same folder | seconds |
| No second copy | After the host runs, the set of localStorage keys, IndexedDB stores and caches is unchanged | the same folder | seconds |
| D1 | A removed or unbought app's records are not listed, return when it is added; favorites and trash rows for them are kept | the same folder | seconds |
| Existing Library tests | Adapters, grouping, trash, favorites | `npx vitest run src/tests/life-records` (existing files) | seconds |
| Sync | Records written the way a pull writes them give the same Library entries on another install | the same folder | seconds |
| One real page | The Library on a seeded device lists the same entries by provider and by the old way; a removed app follows D1; locked shows nothing | `scripts/library-check` against the dev server | about 35 s |
| Types, lint, `provider.test.ts` | Compile, lint, providers match the manifest | seconds | seconds |

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| A key changes and a favorite or Recently Deleted row is orphaned | Keys unchanged and held by the baseline; `lifeRecordKey` stays the only builder |
| A record the page shows today disappears beyond D1 | The parity test lists any difference before anything changes |
| People who removed an app, or whose trial ended, find records missing | Documented consequence of D1; records return on add or purchase; what's new line when the default switches |
| Startup weight | Providers load lazily and only for added apps; the page imports fewer app modules |
| Lock | Providers are called only from the mounted page; a test holds it |
| The page's Mneme write bypasses a provider | Intentional (D5); listed so it is not mistaken for a provider write |
| Notification identity migration | Untouched; K2 stays closed until authorized |

## 12. Next step

On approval of D5 and D6 and the test list, commit 0 (the baseline), which changes no behavior.
