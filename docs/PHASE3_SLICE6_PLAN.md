# Phase 3, Slice 6: the Library through providers

Status: plan for review. No application code, migration, test or build was changed or run to write it. It rests on reading
`docs/LIFE_RECORD_INTEGRATION.md`, `src/core/life-records/`, `src/features/connections/ConnectionsPage.tsx` and `src/app/library/`;
points marked **verify** are what I have not yet read in the code and will read before a commit that depends on them.

## 1. What exists

Reflect's Library is a read-only view across the family. Nine pure adapters (`LifeRecordAdapter`, `src/core/life-records/index.ts`)
turn records into one shape, `LifeRecord`: a stable `key`, a `kind` (reflection, decision, pursuit, life, workout, meal, study, note,
idea, trip, financial), the source app, the source id, a time, a title, optional detail and body, search text, connected value ids and
an archive flag. The page (`ConnectionsPage.tsx`, 851 lines) gathers every input itself with hooks and calls one function that runs all
the adapters:

| Source | How the page reads it today |
| --- | --- |
| Reflections, decisions, life items, Compass pursuits and values | `reflectionService`, `decisionService`, `lifeService`, `compassService`, `pursuits` (Proairetos's own) |
| Askesis runs | `useRuns()` |
| Dynamis strength sessions and plan unit | `dynamisWorkouts`, `dynamisPlan` |
| Soma cooked meals | `useRecipesFromSoma()` |
| Theoria and Praxis study | `useStudy()` |
| Mneme notes and ideas | `mnemeNotes`, `mnemeIdeas` |
| Poreia trips and journal | `poreiaTrips`, `poreiaJournal` |
| Oikonomia financial milestones | `oikonomiaMilestones` |

Library-owned state stays with the Library and is not an app's: saved items (`libraryFavorites`), Recently Deleted
(`libraryTrash`, 30 days, tombstones by record key) and value connections (`libraryValueConnections`). Actions on a record
(archive, restore, connect or disconnect a value, edit a reflection's body) call the owning Proairetos services directly and apply
only to Proairetos-owned kinds (`canArchiveLifeRecord`).

Already built and reusable: the contract and validator (`validateLifeRecordAdapter`), stable keys (`lifeRecordKey`) that favorites and
trash markers depend on, the provider host and its enforcement pattern, `isAdded`/usable gating, `Capability 'library'` in the manifest,
and the parity method used for Home, Calendar and notices.

## 2. What changes

The input gathering moves out of the page, and each companion app projects its own records through a provider. Proairetos's own
records (reflections, decisions, pursuits, life items) stay native: Proairetos is the main app, not a companion provider, and its
adapters keep running on its own services.

| App | `library` provider returns | Source of truth |
| --- | --- | --- |
| Askesis | Sessions (as today, in the person's distance unit) | `askesisWorkouts` |
| Dynamis | Strength sessions | `local:dynamis:workout:`, `setting:dynamis:setup` (unit) |
| Soma | One record per recipe and cooked day | `somaRecipes` |
| Theoria | Reading and study sessions, combined by book and local day | its books and focus records (**verify**: `useStudy` also reads Praxis blocks) |
| Mneme | Notes and ideas the person explicitly selected for Reflect | `local:mneme:` records (**verify** the exact prefix) |
| Poreia | Completed trips and their journal | `local:poreia:trip:`, `local:poreia:journal:` |
| Oikonomia | The person's own financial milestones with `inReflect` | its milestones record; no bills, balances, envelopes or lines |

Not included, as decided: Hydros (stays in Hydros), and every app the Library does not read today.

### The host and its enforcement

- `NoticeLine`-style output is not needed: a provider returns the existing `LifeRecord` list. The adapters are wrapped, not rewritten.
- `mayProvideLibrary(app, provider)`: the manifest lists `library`; the app has a `library` classification; class `shared` is refused.
- `enforceLibrary(app, records)`: only the keys of a `LifeRecord`; `sourceApp` and `source` are the app's own; `kind` is one the manifest
  lists for the app; `key` follows `app:kind:id[:occurrence]` and is unique; `at` is a valid date-time; text fields are strings; `archived`
  is a boolean. A record that fails is dropped and reported.
- `libraryRecords(providers, manifest, ctx)`: asks only apps that are added and usable. An app that is not added shows nothing (decision D1).
- Manifest `library: { kinds, shows, excludes }` per app, classifying what a Library entry may state. The Library is the person's own
  Reflect, so what it states is more than a notice or a Home row (a Mneme note's body, a journal entry's text); the classification names it.
  Reflect's lock hides reflection content today; the Library keeps that rule for the records it applies to (**verify** how the lock reaches
  non-reflection kinds).

## 3. Privacy

The Library already shows text the person wrote (notes, trip journal, reflections) and workout detail (exercise, sets, reps, weight,
notes). That is the point of the Library and is not changed. What this slice adds is an explicit list per app, enforced:

| App | May appear | Never |
| --- | --- | --- |
| Askesis | Title, date, distance and time, notes, how it felt | Heart rate samples, GPS points, health data brought in, shoes |
| Dynamis | Exercises, sets, reps, weights, duration, notes | Health data brought in |
| Soma | Recipe title, cooked date, notes, who it was for | Nutrition grade, ingredient lines beyond the existing search terms (**verify**) |
| Theoria | Book and day, minutes read | Book files, highlights beyond what is projected today (**verify**) |
| Mneme | The note or idea the person selected, with its text | Anything not selected |
| Poreia | Completed trips and journal entries | Bookings, confirmation codes, addresses, documents, spending, upcoming trips |
| Oikonomia | Milestones the person wrote | Bills, amounts of bills, balances, envelopes, statements, transaction lines |

Canary tests put a marker in every "never" field and assert it is in no record, no search text and no body.

## 4. Preserving behavior

- Record keys, ordering, titles, detail, body, search text, value ids and archive flags are held byte for byte by a snapshot of the page's
  list built from fixtures (the baseline commit, as for notices, in UTC and Los Angeles). Favorites and Recently Deleted keep working
  because keys do not change.
- Favorites, trash, value connections, bulk archive and the edit-a-reflection actions are untouched; they act on Proairetos-owned records.
- Offline: providers read the device's copy only.
- A change would come from the "added" gate (D1) and from what the manifest classification removes if anything projected today is on
  the "never" list. I will list any such field before changing it.

## 5. Open decisions

- **D1. Apps that are not added.** Today the page reads Askesis, Dynamis, Soma, Theoria, Mneme, Poreia and Oikonomia records whatever the
  Store says (**verify**). Other surfaces hide a removed app's records ("its records are kept"). Recommendation: the Library follows the
  same gate, so a removed app's records leave Reflect and return if the app is added again. Alternative: keep showing them.
- **D2. Mneme and Oikonomia.** Both project only what the person chose for Reflect. Recommendation: the provider keeps that rule inside
  the app and the host adds nothing.
- **D3. What the Library may state for Dynamis and Askesis** (weights, distances, notes). Recommendation: keep as shown today.
- **D4. Hydros, Philia, Therapeia, Ktema, Phyton, Meletē, Ergon, Diaita.** Recommendation: not in the Library, as today.

## 6. Implementation order (independently reversible commits)

0. **Baseline.** A test that builds the page's record list from fixtures for the seven companion sources and records every field in UTC and Los Angeles. No behavior change.
1. **Contract.** `mayProvideLibrary`, `enforceLibrary`, `libraryRecords`, the manifest `library` type and a classification test. No app and no consumer yet.
2. **Context and adapter.** A `library` host context, an adapter that returns `LifeRecord[]` for the added apps, and a device switch (legacy default).
3. **Apps one at a time:** Askesis, Dynamis, Soma, then Theoria and Mneme, then Poreia and Oikonomia. Each with parity and canaries.
4. **Page.** `ConnectionsPage` takes companion records from the adapter; Proairetos's own stay native. Switch the default; keep the old gathering for rollback.
5. **Remove the old gathering** in its own commit, only after review.

## 7. Tests (proposed; none run)

| Group | What it proves | Time |
| --- | --- | --- |
| Baseline and parity | The provider list equals the page's list, field for field, in UTC and Los Angeles | a few seconds each |
| Contract and enforcement | Unknown keys, another app's records, a kind the manifest does not list, a repeated key and a bad time are dropped | a few seconds |
| Privacy canaries | Nothing on the "never" list reaches a record, its search text or body | a few seconds |
| Existing Library tests (`life-records`, `library`) | Adapters, grouping, trash and favorites still hold | a few seconds |
| Sync | Records written the way a pull writes them yield the same Library entries on another install | a few seconds |
| One real page | The Library on a seeded device lists the same entries by provider and by the old way; a removed app's entries follow D1 | about 35 s |
| Types and lint | Compiles and lints | seconds |

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| A key changes and a saved item or a Recently Deleted marker is orphaned | Keys are unchanged and held by the baseline; `lifeRecordKey` stays the only builder |
| A record the page shows today disappears (D1, or an app's gate) | The parity test lists the difference before anything changes |
| Startup weight: the page imports seven apps' stores | Providers load lazily and only for added apps; the page's chunk gets smaller |
| The lock hides reflections but not other kinds | Verify today's behavior and keep it; do not widen it in this slice |
| Notification identity migration | Untouched. K2 stays closed until it is authorized |

## 9. Next step

On approval of D1 to D4 and the test list, commit 0 (the baseline), which changes no behavior.
