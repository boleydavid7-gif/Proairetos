# Provider contract (design only)

Status: design for review. **No provider is implemented**, no search index exists, and nothing here changes
behavior. It builds on the application manifest (`src/core/apps/manifest.ts`, `docs/APP_REGISTRY.md`) and the
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

## 4. The encrypted search index across independently installed apps

Server-side search is not possible: the server holds only sealed records, and plaintext indexing would break
end-to-end encryption. So the index lives on each device and travels only sealed.

**Projection.** Each provider writes small records (id, app, kind, display title, day, open address, a few search
words) under its own `own-search` allowance and nothing outside the manifest's `indexes`. A projection is a
derived record: it can be rebuilt from the app's own data and is never the source.

**Sync.** Projections sync like other records: sealed with the account key (AD `proairetos-search`, a collection of
its own that needs a server migration when it is built, not in Phase 2), one record per projection, 200-number
overlap pull as today. Each install builds its on-device search index from what it holds and what it pulled.
Which installs hold which projections is the diagnostic's question (`IPHONE_STORAGE_DIAGNOSTIC.md`): if installs are
isolated, an install sees another's records only through sync; if storage is shared, the same sync still applies and
only adds a faster path.

**Offline.** Search runs on the device's copy. A projection not yet pulled is simply not found; nothing is asked of
a server. A result whose target app is not on the device opens its address and the person's install handles it.

**Deletion.** Deleting a record in its app removes its projection in the same write (tombstone), which syncs; a
device removes it from its index when the tombstone arrives. Deleting an app's data, removing the app from the Store
or signing out clears that app's projections on the device. Delete account removes them on the server with the rest.
Window apps (Hydros) drop projections that leave the 30-day window on the next build.

**Permission revocation.** Turning an app's `search` off in Settings (or setting its search class to `private`)
deletes its projections here and syncs the removal; other devices follow on their next pull. Leaving a household
removes that household's `shared` projections. A provider that raises its class (an app update that indexes more) is
ignored until the person accepts the new manifest entry; the manifest version carries this.

**Versioning.** Projections carry the provider's `version`. An index entry with an older version is rebuilt by the
owning app, never read by guess. A version Proairetos does not know is skipped.

**What is not built.** No provider, no projection collection, no index, no migration, no UI. Building them is a
later phase and starts after the diagnostic's results and the owner's approval.

## 5. Compatibility

Providers are additive. An app with no `provides` behaves as it does today. The manifest validator will gain
checks (a `search` capability needs a privacy class and `excludes`; a `private` field is never in a projection).
