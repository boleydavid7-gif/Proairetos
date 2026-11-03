# Life Record integration contract

Reflect's Library is a read-only view across the Proairetos family. Each app remains the authority for its own data. A Life Record adapter projects selected source records into a shared shape; it does not move, copy back, edit, archive, or delete source records.

## Contract

Implement `LifeRecordAdapter<TInput>` from `src/core/life-records/contract.ts`.

Every adapter declares:

- `id`: stable adapter identifier, such as `dynamis.workouts`.
- `owner`: app that owns the authoritative data.
- `kinds`: the Life Record kinds it may emit.
- `toRecords(input)`: a pure projection. It must not write to storage or mutate its input.

Every emitted record must provide:

- `key`: stable and unique for this projected entry. Never derive it from editable title/body text.
- `kind`: what the record represents, not which app produced it.
- `sourceApp` and `source`: stable app ID plus human-readable label.
- `sourceId`: stable ID of the authoritative source record.
- `at`: valid ISO-8601 date-time for when the event happened. For date-only source data, normalize the local calendar day to local noon.
- `title`: short, non-empty display title.
- `detail` / `body`: concise supporting information; omit empty values.
- `searchText`: use `createLifeRecord` so title, source, detail, body and search terms are indexed consistently.
- `valueIds`: connected Compass value IDs, or an empty array.
- `archived`: reflect the source record's archive state; use false when the source has no archive concept.

Use `lifeRecordKey(app, kind, sourceId, occurrenceId?)` for new integrations. The optional occurrence ID distinguishes multiple events derived from one source record (for example, the same recipe cooked on different days). Existing keys are intentionally retained so saved Library favorites are not broken.

Run every adapter through `validateLifeRecordAdapter` in its tests. Tests should cover source identity, stable keys, timestamps, search terms, multiple occurrences, and empty/archived states where applicable.

## Current adapters

| App / owner | Records currently projected | Notes |
|---|---|---|
| Proairetos | Reflections, life items | Reflections retain the originating companion app when written from an app-specific prompt |
| Compass | Decisions, pursuits | Value connections are preserved |
| Askesis | Cardio and activity sessions | Uses the person's distance unit |
| Dynamis | Strength sessions | Includes exercise, sets, reps, weight, duration and notes |
| Soma | Cooked meals | One record per recipe and cooked date |
| Theoria | Study and reading sessions | Reading sessions are combined by book and local day before projection |

## Candidate integrations

These apps can use the same contract, but should contribute intentional, useful records rather than dumping every database row into Reflect.

| App | Good Life Record candidates | Guardrail |
|---|---|---|
| Mneme | Notes and ideas the person chooses to surface | Respect pinned/archive state and user selection; don't automatically expose every private note |
| Poreia | Completed trips and trip journal entries | Do not include passports, travel documents, booking emails or private attachments |
| Hydros | Daily hydration summaries or milestones | Prefer a useful daily summary over one Library row per drink |
| Oikonomia | User-selected financial milestones or reviews | Sensitive by default; never import raw transactions, balances or bills without explicit opt-in |

An app is not required to contribute every record it stores. The Library should help someone revisit meaningful experiences, decisions and thoughts—not become a second copy of every app.

## Source ownership and actions

- Library records are projections, not a second source of truth.
- Editing or deleting source content must happen in the owning app unless a specific, tested cross-app action is intentionally added.
- Favorites are Library metadata and do not modify source records.
- Archive and restore are only offered when the source app has a matching, safe operation. Do not simulate archive by deleting a source record.
- A source link should open the original record when the app supports deep links. If it cannot, open the relevant source-app area and do not imply that the exact record was opened.

## Adding an app

1. Add its stable app ID and display label to the contract unions.
2. Define the source-specific input type from the app's actual record model.
3. Implement a pure adapter and register it in `lifeRecordAdapters`.
4. Add it to the Library data-loading boundary with the app's existing sync/update subscription.
5. Add deep-link support where the source app can open an exact record.
6. Test identity, chronology, search, time zones, empty states and duplicate prevention.
7. Decide explicitly whether the source is opt-in or sensitive before exposing it in the Library.

This keeps future integrations predictable while letting each app retain its own data model and user experience.
