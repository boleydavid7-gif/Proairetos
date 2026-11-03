# Life Record integration contract

Reflect's Library is a read-only view across the Proairetos family. Each app remains the authority for its own data. A Life Record adapter projects selected source records into a shared shape; it does not move, copy back, edit, archive, or delete source records.

## Contract

Implement `LifeRecordAdapter<TInput>` from `src/core/life-records/contract.ts`.

Every adapter declares:

- `id`: stable adapter identifier, such as `dynamis.workouts`.
- `owner`: app that owns the authoritative data.
- `allowOriginOverrides`: normally omitted; set only for stored records that can preserve a different originating app, such as Proairetos reflections created from companion-app prompts.
- `kinds`: the Life Record kinds it may emit.
- `toRecords(input)`: a pure projection. It must not write to storage or mutate its input.

The validator enforces that each record's source app matches the adapter owner unless `allowOriginOverrides` is explicitly enabled, and that the human-readable source label matches the canonical app label.

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
| Mneme | Notes and ideas explicitly selected for Reflect | Notes use the existing pin choice as a legacy fallback; ideas require an explicit selection. Archived notes remain in Library Archive |
| Poreia | Completed trips and their journal entries | Upcoming trips, bookings, travel documents, spending and private attachments are not imported |
| Oikonomia | User-authored financial milestones and reviews | Each entry is manually created and opt-in; no bills, balances, envelopes, statements or transaction lines are imported |

## Deliberately excluded

Hydros is hidden and is deliberately excluded from the Reflect integration contract and Library feed. Do not add Hydros records or hydration summaries.

Oikonomia is intentionally different from the other sources: Reflect must never query its underlying financial records for automatic summaries. Only the separate, user-authored milestone entries with `inReflect: true` are projected. Those entries contain no amount or account fields.

## Source ownership and actions

- Library records are projections, not a second source of truth.
- Editing or deleting source content must happen in the owning app unless a specific, tested cross-app action is intentionally added.
- Favorites are Library metadata and do not modify source records.
- Mneme notes and ideas enter Reflect only when selected; archived notes retain their archive state. A note's existing pinned state is used only as a backward-compatible selection when no explicit choice exists.
- Poreia contributes completed trips and journal entries attached to those completed trips. Upcoming plans and sensitive trip data are excluded.
- Oikonomia contributes only manually authored milestones that are explicitly left included. The adapter never reads bills, budgets, envelopes, balances, statement imports or transaction descriptions.
- Archive and restore are only offered when the source app has a matching, safe operation. Do not simulate archive by deleting a source record.
- A source link should open the original record when the app supports deep links. If it cannot, open the relevant source-app area and do not imply that the exact record was opened.

## Adding an app

1. Add its stable app ID and display label to the contract unions (do not add hidden apps without an explicit product decision).
2. Define the source-specific input type from the app's actual record model.
3. Implement a pure adapter and register it in `lifeRecordAdapters`.
4. Add it to the Library data-loading boundary with the app's existing sync/update subscription.
5. Add deep-link support where the source app can open an exact record.
6. Test identity, chronology, search, time zones, empty states and duplicate prevention.
7. Decide explicitly whether the source is opt-in or sensitive before exposing it in the Library.

This keeps future integrations predictable while letting each app retain its own data model and user experience.
