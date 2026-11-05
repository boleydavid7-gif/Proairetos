# Provider contract (design only)

Status: approved design (docs/PHASE3_PLAN.md). Slices 1 and 2 are built: the provider types, host and policy, and search
providers for Soma, Theoria, Philia, Ergon, Therapeia, Ktema, Poreia, Askesis, Dynamis, Oikonomia and Hydros. Home,
calendar, notices and library providers do not exist yet. Section 4 below was revised by the owner's decision D1. It builds on the application manifest (`src/core/apps/manifest.ts`, `docs/APP_REGISTRY.md`) and the
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
