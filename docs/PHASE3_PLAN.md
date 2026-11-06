# Phase 3 implementation plan: shared information architecture

Status: **approved by the owner (D1 to D6, Slice 1 only).** Slices 1 and 2 (all search) are built; Slices 3 to 6 wait for review. Written before any code changed. Written after reading the Life Record adapter, the sync
engine and sealing, the application manifest, the provider contract and the code that already gathers other apps'
information for search, Today, Days ahead, notices and the Library.

Two inputs are still open and do not block this plan: the owner's iPhone diagnostic results (they decide whether
live signals can cross installs, which is an optimization here, never a requirement), and the decisions in section 11.

## 0. What the inspection found

1. **Encrypted sync already is the bridge between installs.** `syncCollections` (30 collections, including
   `somaRecipes`, `oikonomiaBills`, `hydrosDrinks`, `theoriaBooks`, `poreiaTrips`) plus `preferences` (one record per
   synced browser-storage setting, `syncedSetting`) carry every app's records, sealed with the account key
   (`sealRecord`, AES-GCM, AD = collection and id). Any install that is signed in and unlocked pulls the whole
   account's data into its own storage. The apps that keep records in browser storage (Diaita, Philia, Ergon,
   Therapeia, Dynamis, Ktema, Phyton, Mneme, Meletē) travel as `preferences` records. So on any one install,
   Proairetos can already read another app's records locally after a sync. Nothing needs shared browser storage.
2. **The pieces of a provider system exist, hand-wired.**
   - Library: `LifeRecordAdapter` (`src/core/life-records/`), nine adapters, used only by `ConnectionsPage`.
   - Search: one 390-line `gather()` in `features/search/SearchSheet.tsx` with a loop per app.
   - Home: `TodayAppsOverview.tsx` and `app/family/fromApps.ts`.
   - Calendar: `app/calendars/{philia,poreia,therapeia,meleteCalendar,ktemaDates}.ts` and `app/family/glance.ts`.
   - Notices: `app/notify/familyNotices.ts` (imports seven apps' state directly) and `upcoming.ts`.
   Each reads the other app's local copy. None is registered anywhere; all are hard-coded in Proairetos.
3. **Two things conflict with the approved rules and need your decision (section 11, D2 and D4).**
   - Universal search indexes an Oikonomia bill's `notes` field today (`SearchSheet.tsx`, the `bill` loop). The
     approved rule says financial notes must not be indexed. The bill model has no payee field; its `name` is the payee.
   - Search also indexes health and identifying fields in other apps: Therapeia dose and notes, Ktema serial
     numbers, Philia notes and gift ideas. Only Oikonomia and Hydros were classified so far.
4. `onRemoteChanges(listener)` in `syncController.ts` says that something changed, not what. Incremental
   invalidation needs the changed collections; adding that is additive.
5. `DB_VERSION` is 18 (CLAUDE.md still says 8; it is stale). The server's `records` table is unchanged by this plan.

## 1. Proposed architecture

**Principle: derive, do not copy.** A provider is a pure function from an app's already-synced local records to a
small view. Views are computed on the device and are never stored on the server. There is no second copy of any
record, so nothing can drift, and deletion and revocation follow from the source.

```
 install A (any app)                          install B (Proairetos)
 ┌──────────────┐  sealed records   ┌────────┐   sealed records   ┌──────────────────────────┐
 │ app records  │ ───── sync ─────▶ │ server │ ───── sync ──────▶ │ local copy of the records │
 └──────────────┘  (unchanged)      └────────┘   (unchanged)      └────────────┬─────────────┘
                                                                                │ providers (pure, on device)
                                                              ┌─────────────────▼─────────────────┐
                                                              │ ProviderHost: policy + permissions │
                                                              └──┬─────────┬─────────┬────────┬───┘
                                                              search     calendar   home    notices   library
```

Layers:

1. **Transport (exists):** sealed sync. Unchanged.
2. **Providers (new):** per app, per capability, registered against the manifest's `AppId`.
3. **ProviderHost (new):** the only caller of providers. It enforces capability, privacy class, whether the app is
   added and usable, the person's switches and the Reflect lock, and drops any field the manifest does not allow.
4. **Consumers (existing screens):** search, Today, Days ahead, notices, Library ask the host, never an app's state.

**A synced `projections` collection is not part of v1.** The provider contract drafted in Phase 2 proposed one;
this plan recommends against it for now (D1): it would add a migration, a second copy of every searchable field and
a new surface for leaks, and every consumer already runs in Proairetos, which holds the provider code and the
synced records. Revisit only if measurement shows projecting is too slow at scale, or an app outside Proairetos
needs to search others. The design below leaves the door open: a projection is already the host's output shape.

**Identity.** `RecordRef = { app: AppId; kind: string; id: string; occurrence?: string }`, written
`app:kind:id[:occurrence]`. It is exactly `lifeRecordKey`, so saved Library favorites and trash markers keep working.
It never derives from editable text. A projection holds a ref and display strings only, never the record.

## 2. Exact files and services affected

New (all additive):

| Path | Purpose |
| --- | --- |
| `src/core/providers/types.ts` | `Capability`, `RecordRef`, per-capability output types, `Provider`, `PrivacyClass` re-export |
| `src/core/providers/host.ts` | Pure host: `search(query)`, `calendarLines(range)`, `homeRows(group)`, `notices(range)`, `library()` over a provider list and a context |
| `src/core/providers/policy.ts` | The enforcement: allowed fields, class rules, window, gating |
| `src/app/providers/registry.ts` | The static map `AppId` to lazily imported provider module (keys checked against the manifest) |
| `src/app/providers/context.ts` | Builds the context: `isAdded`, `mayUse`, switches, lock, today, time zone |
| `src/app/providers/useProviders.ts` | Hook: runs the host, re-runs on `onRemoteChanges(collections)` and store changes |
| `src/oikonomia/providers/search.ts`, `src/hydros/providers/search.ts` | Slice 1 providers |
| `src/tests/providers/*.test.ts` | Contract, privacy canary, sync-flow, parity tests |

Changed:

| Path | Change | Slice |
| --- | --- | --- |
| `src/core/apps/manifest.ts`, `validate.ts` | `provides: Capability[]`, `search.fields` (the allowed field names), `search.maxAgeDays`; validator ties `provides` to a registered provider | 1 |
| `src/app/sync/syncController.ts` | `onRemoteChanges` also reports changed collections (additive, existing listeners unaffected) | 1 |
| `src/features/search/SearchSheet.tsx` | Oikonomia loop replaced by the host; Hydros added; later each app's loop moves | 1, 2 |
| `src/features/settings/` (What's included) | One switch per app and capability, in the existing synced `proairetos.providers` preference (no migration) | 1 |
| `src/features/today/TodayAppsOverview.tsx`, `app/family/fromApps.ts` | Rows come from home providers | 3 |
| `src/app/calendars/*`, `app/family/glance.ts`, `DaysAheadPage.tsx` | Lines come from calendar providers | 4 |
| `src/app/notify/familyNotices.ts`, `upcoming.ts` | Notices come from notice providers | 5 |
| `src/core/life-records/index.ts`, `ConnectionsPage.tsx` | Adapters registered as library providers; input gathering moves into the host | 6 |
| `docs/PROVIDER_CONTRACT.md`, `docs/APP_REGISTRY.md`, `docs/LIFE_RECORD_INTEGRATION.md`, `CLAUDE.md` | Updated as each slice lands | each |

Not touched in any slice: the sync engine's wire format, `keys.ts`, sealing, the Worker, Supabase functions and
migrations, navigation, the dock, application interfaces.

## 3. Data flow between applications

Worked example, a bill and a search, with two installs of two different apps:

1. Oikonomia (its own install) saves a bill. Its store writes the local `oikonomiaBills` record and calls `syncSoon()`.
2. The engine seals it (key, collection, id as authenticated data) and pushes. The server holds ciphertext, the
   collection name, the id, a sequence number and a deleted flag, as it does today.
3. Proairetos (another install) pulls, opens the record with the account key, writes it to its local store, and
   reports `changed: ['oikonomiaBills']`.
4. The host's cache for the Oikonomia search provider is invalidated. The next search (or an idle pass) runs the
   provider over the local bills and gets `{ ref, title: bill.name, fields: [due date, paid status], open }`.
5. Search shows the row. Opening it goes to `/oikonomia/?open=bill:ID`. The amount, account, balance and notes were
   never in the projection.
6. If the bill is deleted in Oikonomia, step 2 pushes a tombstone, step 3 removes the local record, step 4 drops the
   row. No separate deletion path exists.

Same-install updates need no sync: stores already notify subscribers, and the host subscribes to them.

## 4. Encryption and synchronization strategy

- **Encryption is unchanged.** Records stay end-to-end sealed. The server gains no key, no plaintext, no index.
- **Nothing new is server-visible in v1.** No new collection, so no new ids, counts or timing.
- **Offline.** Providers read only the local copy. Search, Today, calendar and the Library work with no network.
  What has not been pulled yet is simply not found.
- **Incremental.** The host keeps one cache entry per provider, keyed by the provider version and the fingerprints
  of the collections it reads. `onRemoteChanges` reports which collections changed; only dependent providers
  recompute. A full rebuild is the fallback and is cheap (the search corpus rebuilds on every open today).
- **Conflict.** Providers have none: they are derived. Source records keep the engine's rule (this device's edit
  wins, the Account page says so). The view always reflects the local winner.
- **Stable ids.** `RecordRef`, as above. An event derived from one record (a meal cooked on two days) carries an
  `occurrence`.
- **Only synced sources.** A provider declares its `sources` (collections and preference prefixes). A test checks
  that each is a synced collection or allowed by `syncedSetting`, so a result never depends on device-only data
  that other installs cannot have (Ktema files, photos, book files stay unsearchable across installs by design).
- **Persisted index (not in v1).** Rebuilt from records on open, as now. If a persisted copy is ever measured as
  necessary, it is a device-only IndexedDB store (additive, deletable, `DB_VERSION` 19), sealed with the data key
  with a distinct label so it is ciphertext at rest, which the records themselves are not today.

## 5. Provider interfaces

```ts
type Capability = 'library' | 'search' | 'calendar' | 'notices' | 'home';

type RecordRef = { app: AppId; kind: string; id: string; occurrence?: string };

type Provider<C extends Capability> = {
  app: AppId;                 // a manifest id; checked
  capability: C;
  version: number;            // bump when output meaning changes
  privacy: PrivacyClass;      // the class of everything it returns
  sources: readonly string[]; // synced collections or preference prefixes it reads
  read(ctx: ProviderContext, scope: ScopeOf<C>): Promise<OutputOf<C>> | OutputOf<C>; // pure: no writes, no network
};

type SearchProjection = { ref: RecordRef; title: string; fields: { name: string; text: string }[]; at: string; label: string; open: string };
type CalendarLine     = { ref: RecordRef; day: string; time?: string; title: string; open: string };
type HomeRow          = { ref: RecordRef; group: 'practice' | 'attention'; title: string; line?: string; open: string; action?: 'done' | 'skip' };
type NoticeOut        = Notice;           // the existing type
type LibraryOut       = LifeRecord;       // the existing type; existing adapters are wrapped, not rewritten
```

An app implements only the capabilities it lists in its manifest `provides`; the validator fails a mismatch in
either direction. Registration is therefore the manifest, and `registry.ts` only supplies the module for an id that
the manifest already declares: there is no second registry.

A provider never receives another app's records and never writes. `ProviderContext` carries the app's own local
records through the existing store readers (`readStore`, `readRecords`), the date, time zone and the person's
switches.

## 6. Privacy enforcement

Three classes, enforced in the host (`policy.ts`), not trusted to each provider:

| Class | Rule in the host |
| --- | --- |
| `private` | The host refuses to call the provider from any consumer except the owning app's own screens. No projection leaves. |
| `own-search` | Allowed only for `search` and `library`, only to the signed-in person's own universal search, only the manifest's `search.fields`, only inside `search.maxAgeDays` when set. Results are display strings and a ref; other apps never receive records. |
| `shared` | Allowed only where the app's list is shared by the household (`householdLists(app)`) and `useListPermissions` allows the level. Interface defined now, nothing built in v1. |

Further gates, applied to every capability: the app is added and `mayUse` (Store and trial), the person's per-app
per-capability switch, the Reflect lock (reflections stay out of search while locked, as today), and child level
for household parts.

Field enforcement: the host intersects a provider's field names with `manifest.search.fields` and discards the rest;
unknown fields are dropped, not passed through. The manifest keeps `excludes` as the human-readable statement.

Verification, not trust: **canary tests** seed each restricted app's records with unmistakable values in every
excluded field (a bill amount `987654.32`, a note "CANARY-NOTE", an account number) and assert none appears anywhere
in provider output, host output, or the rendered search results, for every capability. A provider that adds a field
fails the test until the manifest allows it.

Approved restrictions preserved:

- **Oikonomia** indexes bill name (the payee), due date and paid or unpaid. Not amounts, account numbers, balances,
  statement lines, notes or transaction details. A result opens inside Oikonomia.
- **Hydros** indexes named drink types and day-level summaries inside a rolling 30-day window, private to the account.

`declares` stays a statement for people and tests, not enforcement.

## 7. Coverage by application

| App | library | search | calendar | notices | home | Class and note |
| --- | --- | --- | --- | --- | --- | --- |
| Diaita | no | no | no (sleep stays inside Diaita) | yes (exists) | yes (sleep record) | `private` for sleep data |
| Askesis | yes (exists) | log entries with words | yes (planned sessions) | yes | yes | `own-search` |
| Dynamis | yes (exists) | sessions with a note | yes (training days) | yes | yes | `own-search` |
| Hydros | no (decided) | drink names, day summaries, 30 days | no | yes | yes | `own-search`, window |
| Theoria | yes (exists) | books, highlights, notes | no | yes | yes | `own-search` |
| Soma | yes (exists) | recipes | planned meals | no | yes | `own-search` |
| Ergon | no | chores (name, room) | no | yes | yes | `own-search` |
| Oikonomia | milestones only (exists) | bill name, due date, paid status | bill dates | yes | yes | `own-search`, restricted |
| Poreia | completed trips (exists) | trips, plans | trips and plans | yes | yes | `own-search` |
| Philia, Therapeia, Ktema, Phyton, Mneme, Meletē | where they have it today | decide per field (D4) | where they have it today | where they have it today | where they have it today | to classify |
| Family (household) | not an app | not an app | not an app | household invites exist | no | The manifest has no household app. It is the authority for `shared` access, not a provider (D5). |

Apps expose only what is useful. Missing capabilities are simply absent from `provides`.

## 8. Home and calendar without duplication

Providers return **summaries or references**: a `RecordRef`, a title, one line and an `open` address. They never
return the record and Proairetos never stores one. Today's rows and Days ahead's lines are computed per render and
dropped. Actions (mark done, not today) keep their present rule: only when the person acts, through the owning app's
own function, with undo, as `fromApps.ts` does now. A calendar line for something that also appears as a Today row
shares one `ref`, so the host can show it once where both would appear.

## 9. Migration requirements

- **Server: none.** No migration, no function change, no new column or collection.
- **Local database: none in v1.** (Later, only if measured: one additive device-only store, `DB_VERSION` 19, with an
  upgrade test, per the repository rule.)
- **Settings:** one new synced preference, `proairetos.providers` (`{ off: [{ app, capability }] }`, absent = defaults).
  It uses the existing `preferences` collection. Old devices ignore an unknown key.
- **Manifest:** new optional fields. Existing consumers unaffected.
- **Compatibility:** old installs keep working; they never see providers. New installs read the same records.

## 10. Testing and acceptance criteria

Tests (each slice adds its own):

1. **Contract:** every provider is pure (storage and network proxies that throw on write or call), emits stable refs
   (same input, same refs; never from editable text), valid timestamps, no fields outside the manifest.
2. **Parity (before any move):** snapshot the current output of `gather()`, Today rows, calendar lines and notices
   for a fixed seeded dataset, then require the migrated path to match, except for decisions in section 11.
3. **Privacy canary** (section 6), for every capability, every restricted app.
4. **Sync flow with a fake server** (the pattern in `householdFlow.test.ts`): two installs with separate stores; a
   record written on A appears in B's provider output after sync; an edit propagates; a delete removes it; with the
   remote unreachable B still returns results (offline); both edit, the local winner shows; a revoked switch
   removes results and the removal syncs; an unknown provider version is skipped.
5. **Manifest validation:** `provides` and registry agree; every `sources` entry is synced; every provider's app is a
   manifest id (retired apps never provide).
6. **Regression:** the full suite, `tsc`, lint, build, `apps:check`, in UTC and two other time zones; the Playwright
   search, Today, Days ahead and notice checks. The together-check's 13 baseline failures stay listed and are not
   used as evidence; repairing those steps is a separate task that should come first if browser evidence is wanted.

Acceptance for Slice 1 (section 12): all of the above for search; Oikonomia results show name, due date and paid
status only and open the bill; a canary bill note is not found; Hydros is findable only when on and only within 30
days; every other search result is byte-identical to before; the suite and checks are green; no server or database
change.

## 11. Decisions needed from the owner

- **D1.** Drop the synced `projections` collection from v1 and derive on device (recommended). This revises the
  Phase 2 contract's section 4.
- **D2.** Stop indexing Oikonomia bill `notes` in universal search, to match the approved rule. This changes search
  behavior (a note-only match disappears). Recommended: yes.
- **D3.** Hydros search default. Recommended: off until the person turns it on in What's included.
- **D4.** Classify the other searched fields. Today's search indexes Therapeia dose and notes, Ktema serial numbers,
  Philia remember lines and gift ideas, Poreia confirmation codes, Soma notes. Proposed: keep them as today (they
  are the person's own search), mark each `own-search` with its field list in the manifest so the rule is explicit,
  and exclude Therapeia dose from search if you prefer (a health-adjacent field). Nothing changes unless you say so.
- **D5.** Treat the household as the permission authority for `shared`, not as an app or provider.
- **D6.** No persisted index at first.

## 12. The smallest useful first implementation (Slice 1)

**Provider core plus the search capability for Oikonomia and Hydros only**, the two apps whose search rules you
approved. It is useful (it fixes the one place today's search breaks an approved rule and adds Hydros) and small
enough to verify fully:

1. `src/core/providers/` types, host and policy; `provides` and `search.fields` in the manifest and validator;
   `onRemoteChanges` with changed collections.
2. Oikonomia and Hydros search providers; the Oikonomia bill loop in `SearchSheet.tsx` replaced by the host; Hydros
   rows added (off by default under D3); the `proairetos.providers` switch in What's included.
3. Canary, contract, sync-flow, parity and manifest tests as in section 10.

No other app, screen or capability changes in Slice 1.

## 13. Recommended implementation order

1. **Slice 1:** core plus Oikonomia and Hydros search (above).
2. **Slice 2:** the remaining search loops, one app per commit, each held byte-identical by the parity snapshot
   (after D4).
3. **Slice 3 (built, awaiting review):** home providers (`TodayAppsOverview`, `fromApps`); see PROVIDER_CONTRACT section 6.
4. **Slice 4:** calendar providers (the five calendar files and `glance.ts`).
5. **Slice 5:** notice providers (`familyNotices`, `upcoming`). Last because notices reach people when the app is
   closed and the server rows depend on them.
6. **Slice 6:** the Library adapters registered as library providers.
7. **Later, only if measured:** a persisted sealed index or a synced projections collection.

Each slice is its own commit on the session branch and independently reviewable. After each: the full suite, the
checks, and your review before the next.

## 14. Rollback strategy

- Every slice is one commit; `git revert` of that commit restores the previous behavior, since no data format, server
  object or database store changes.
- Old code paths stay until the new path matches the parity snapshot; removing an old path is a separate commit, so
  rolling back a removal never loses the earlier one.
- The `proairetos.providers` switches let one app or capability be turned off without a release. If the setting is
  missing or unreadable, the old behavior applies.
- A device-only index store (if ever added) is deleted by dropping the store; the data it held is derived.
- Nothing goes to `main` without your review and approval.
