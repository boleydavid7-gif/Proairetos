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

Hydros is available as a companion app but remains deliberately excluded from the Reflect integration contract and Library feed. Do not add Hydros records or hydration summaries; hydration stays in Hydros.

Oikonomia is intentionally different from the other sources: Reflect must never query its underlying financial records for automatic summaries. Only the separate, user-authored milestone entries with `inReflect: true` are projected. Those entries contain no amount or account fields.

## Library organization and cross-app relationships

The Library is designed to remain useful as the record count grows:

- Search is accent-insensitive and treats multiple words as independent terms, so the terms can appear in any order.
- Type filters show live counts for the current view and other active filters.
- Refine filters include date range, chosen Compass value, source app and sort order.
- Date grouping is hierarchical: collapsible years contain collapsible months. The first year and its newest month are expanded by default; older periods begin collapsed. Counts reflect all matching results, not only the currently rendered page.
- Results can also be grouped by source app or shown as one continuous list. Grouping preserves the selected chronological order.
- The Library loads a limited first page and reveals more records on demand.

### Recently Deleted

Recently Deleted is a synced, Library-owned recovery area with a 30-day retention period. Moving a record there hides its projection from the Library but does not delete or mutate the authoritative record in its companion app. Restoring removes the Library trash marker and returns the record to its prior source-defined state (including Archive, if it was archived before being trashed).

Permanent removal and automatic 30-day expiry create a small Library tombstone so that the source record does not silently reappear in Reflect. The original record remains in its owning app and can still be opened there. This is intentional: Reflect is a cross-app projection, not an owner of companion-app data. Permanent removal also clears Reflect-only favorites and Library-owned Compass links for that entry.

The Trash view supports individual and bulk restore, individual and bulk permanent removal, and Empty Trash. Destructive actions require confirmation. Expiry is enforced when the Library is opened or its synced Trash data changes; there is no server-side deletion of source records.

### Value connections

A record can be connected to any of the person's chosen Compass values from its Library entry. These optional cross-app links are stored separately in `src/app/library/value-connections.ts` as synced Proairetos Library metadata. They do not write into Mneme, Poreia, Oikonomia or other companion-app source records.

Native source value links remain authoritative for records that already support Compass values. The Library merges both kinds of links for filtering and discovery. Removing a link removes it from its owning store: the companion app for native links, or Library metadata for Library-created links.

Entries that share at least one chosen value can show one another in a compact Related entries section. This creates deliberate connections between different parts of a person's life without guessing relationships from private text or using automatic AI categorization.

### Bulk Library management

Selection mode is opt-in, so checkboxes do not clutter the normal reading view. While selection mode is active, people can select individual entries or every result in the current filtered view, including results beyond the currently rendered page.

Bulk actions include:

- Save selected entries or remove selected entries from Saved.
- Archive or restore only record kinds with a supported source-app operation. Other kinds remain untouched.
- Connect selected entries to a Compass value using Library-owned metadata.
- Disconnect a chosen value from selected entries. This removes the Library-owned link and, where present, the native source-app link.

Bulk archive and restore run entry by entry, report partial failures, and offer one combined undo action. The selection toolbar and checkboxes use the Lamplight button, field, spacing and touch-target tokens. They appear only while selection mode is active.

### Source-safe deletion

- Moving any Life Record to Recently Deleted is a Library-only operation.
- Permanently removing a trashed entry removes it from Reflect, not from its authoritative source app.
- No companion-app source record is physically deleted by Library Trash.
- The 30-day expiry uses a retained tombstone so deleted projections cannot reappear on the next source refresh.
- If a person wants to permanently delete the underlying record, they must do so in the owning app.

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
