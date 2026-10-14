# Product audit

This audit looks at the fourteen apps as a web product: usefulness, reliability, data safety, portability, accessibility, and the level of finish people expect from a paid app. It keeps the product rules in `docs/PRODUCT_ARCHITECTURE.md`: facts over scores, user choice over automatic interpretation, and a local-first privacy boundary.

The built site opened all fourteen app roots at phone width in a production preview with no console or page errors. That is a useful baseline, but it does not replace the real-device checks in `docs/TODO.md`.

## Highest-priority work

### P0: make the existing product dependable

1. **Finish the live server path.** The owner checklist still has the reminder-source migration and function deployment, sign-in handoff, passkeys, calendar feed, and own-storage setup open. Until those are complete, the apps look finished while important paid-app expectations—closed-app reminders, recovery, multi-app sign-in, and dependable cross-device use—remain partly local or unavailable.
2. **Make data portability explicit.** The family backup carries records and settings. Theoria already offers sealed book copies, Proairetos attachments follow the encrypted sync/backup path, and Askesis songs, Ktema files, Philia photos and Phyton photos now have one-archive Save a copy and Restore a copy actions. Encrypted account copies remain for those device libraries, alongside the existing warnings.
3. **Run a real-device release pass.** Test iPhone Safari/Home Screen, Android Chrome, and desktop Chrome/Edge for install, reload, offline reopen, storage pressure, screen lock during timers, microphone, camera, GPS, push, sign-in handoff, passkeys, backup restore, and service-worker updates. The code has many platform-specific paths, and the TODO list confirms that most have not been exercised on a real phone.
4. **Add an in-app system check.** Account now shows connection, sync state, reminder availability, browser storage and web reminder setup, with Check again and a privacy-safe Copy details action. A full cross-app check remains.
5. **Add cross-app smoke coverage.** The recent Askesis/Soma settings crash came from a shared component used outside Proairetos’s provider. A browser test that opens each app, More/Settings, Account, backup, and one primary create/edit flow would catch this class of regression before release.

### P1: shared paid-app foundations

- **Search and navigation:** add consistent search, filters, sorting, and keyboard shortcuts where a collection is large. Proairetos search is broad but exact-word based; most companion apps have no in-app search beyond their primary list.
- **Accessibility:** complete keyboard, screen-reader, focus-return, dialog, reduced-motion, contrast, touch-target, and dynamic-text checks for every app. The code has good individual details, but there is no complete multi-app accessibility gate.
- **Export:** offer useful human-readable exports beside the encrypted family backup: workouts, sleep, hydration, spending, medicines/readings, plants, belongings, and study history as CSV/JSON/Markdown where appropriate.
- **Recovery:** test and document a complete phone-replacement journey: install Proairetos, sign in, unlock, restore records, restore files, add Home Screen apps, and confirm reminders.
- **Support:** keep Help and feedback available in every app, add a privacy-safe diagnostic copy action, and publish a short status/setup guide for sync and reminders.
- **Commercial readiness:** there is no subscription, entitlement, receipt, or account-plan layer. If the product is meant to become paid, define the paid boundary before adding one-off premium features so the Store, account, server checks, and restore-purchase behavior have one model.

## App-by-app gaps

### Proairetos

Already strong: capture, item types, routines, schedules and rotations, calendar context, Today, Days ahead, Focus, Reflect, Compass, decisions, pause practices, search, backup/restore, encrypted sync, and reminders.

Most valuable gaps:

- Read-only calendar feeds are present, but there is no full Google/Apple calendar connection or write-back. A paid organizer normally makes calendar setup and two-way behavior clear.
- The item model has types, values, plan groups, repeats, and search, but no richer projects/areas/tags or saved views for people with a large system.
- Attachments are in device backups but not sync. A second device can receive the item without its photo or file.
- There is no shared household/workspace model for Proairetos itself; collaboration exists only in selected companion apps.
- The web app has no native quick-add widget, lock-screen action, or background capture path. Those are platform limits worth explaining in the install/help flow.

### Askesis

Already strong: progressive running plan, placement test, gentler path, guided audio sessions, bells, wake lock, GPS distance, manual workout log, heart-rate field, effort/felt notes, watch GPX/TCX import, pace/zones, progress, year, and reminders.

Most valuable gaps:

- Apple Health, Health Connect, Garmin/Strava, or another wearable import. Today a runner must enter most results manually or import a file.
- A route map and reliable background GPS. The current web GPS keeps the screen awake; a locked phone cannot provide the experience people expect from a paid running app.
- Custom workouts and plan editing. The generated path is good, but a runner cannot build a reusable interval session or edit a session structure.
- Export of the run log and route data, plus plain facts such as best recorded time/distance and pace trends.
- Askesis music remains device-only, with Save a copy and Restore a copy archives; an encrypted account copy would make a phone change one step.

### Soma

Already strong: recipe import, pasted recipes, TheMealDB ideas, serving scaling, ingredient parsing, grocery generation, aisle learning, kitchen inventory, loose weekly planning, cooking mode, timers, speech controls, nutrition, seasons, swaps, shared groceries, backups, and recipe sharing.

Most valuable gaps:

- Recipe-card photo/OCR import is explicitly listed as the next feature in `docs/SOMA.md`.
- Barcode scanning and a fuller pantry model: quantities, expiry, package sizes, and “use soon” suggestions.
- A stronger meal-plan workflow: repeat a week, drag meals, plan leftovers, and build a shopping list across more than one week.
- More complete nutrition and dietary controls: allergens, dietary exclusions, nutrient targets, and a way to mark a recipe as unsuitable without turning food into a score.
- A store-aware grocery workflow or at least a shareable, printable shopping view with quantities and checked history.
- Optional AI help is listed as future work; it needs a clear privacy boundary and a cost/availability state before becoming a paid-app promise.

### Oikonomia

Already strong: recurring bills, payments, calendar view, monthly plan by area, statement CSV import, spent view, subscriptions named in categorisation, bill calendar export, Soma meal cost connection, and year facts.

Most valuable gaps:

- Bank/card connection or a maintained import workflow beyond CSV. Manual statement import is useful but not competitive with finance apps that reconcile accounts automatically.
- Receipt capture/OCR, merchant rules, duplicate detection, and a review queue for imported transactions.
- Cash-flow forecasting, multiple accounts, transfers, recurring income, and rollover/envelope budgeting. The current monthly plan is a single user-entered plan.
- Shared household finances with permissions and a clear separation between private and shared records.
- CSV/JSON export and a reconciliation history so the person can audit changes.

### Hydros

Already strong: one-tap logging, custom drink profiles, custom-drink History, glasses, daily amount, units, caffeine facts, Flow week/month views, work-block timing, run-day connection, and reminders.

Most valuable gaps:

- Apple Health/Health Connect and wearable integration for water and activity context.
- A quick action from the Home Screen or lock screen. The current web flow still requires opening the app.
- Edit/correct an old drink from history, and export the log.
- Longer-term plain facts: caffeine timing, days with entries, average intake by schedule type, and side-by-side comparisons without a grade.
- A clear reminder health state after the server setup: permission, subscription, next server update, and last delivery.

### Praxis

Already strong: timed study blocks, focus history, break/reflection flow, sounds, lock-screen audio behavior, cards with Leitner spacing, bulk card entry, look-again scheduling, study charts, and Theoria links.

Most valuable gaps:

- A richer note/highlight path from Theoria into a card or study block. The current connection starts a reading block but does not turn selected ideas into review material.
- Card editing, tagging, archiving, import/export, and a review history. Removing is present; maintaining a real card library is still thin.
- A clearer study plan for exams or projects: target date, topics, blocks, and a factual “what is covered” view.
- Export of sessions and cards, plus a recovery warning for local card data.

### Theoria

Already strong: text/Markdown/EPUB/PDF import, metadata, reader themes and fonts, highlights, notes, bookmarks, notebooks, Kindle/Readwise import, PDF pages, reading position, reflections, Praxis links, and optional sealed cloud copies.

Most valuable gaps:

- Books are device-only unless the person opts into a sealed account copy. The default needs a stronger warning and a one-tap encrypted copy/restore flow.
- OCR and text search for scanned PDFs; rendering pages is not the same as making a scan searchable.
- More complete annotation export (Markdown exists, but a structured JSON/CSV export and notebook export would help).
- Better library management: shelves/tags, collections, duplicate detection, and filtering by reading status.
- Reading reminders and a clearer handoff from a book passage to Praxis cards or a Reflect note.

### Diaita

Already strong: shift-aware sleep planning, sleep/wake, naps, light, caffeine, meals, morning check-in, sleep log, weekly amount/regularity facts, sources, Wind down, Can’t sleep, worry time, sourced room guidance, and reminders.

Most valuable gaps, matching the earlier product brief:

- Each worry now has a direct Think it through handoff into Proairetos; Capture remains available for another concern.
- A clearer morning-light plan alongside the room guidance.
- Side-by-side facts now include recorded sleep after an Askesis run, Dynamis training, Hydros caffeine after cutoff, and scheduled night shifts; Soma meals remain.
- Two-week experiments now offer a fixed wake time, caffeine cutoff, or morning daylight, with before/after recorded amounts.
- A source-backed regularity suggestion and a plain doctor prompt for marked loud snoring, waking gasping, or three months of poor sleep now have “Not for me.”
- Wearable/sleep-platform import and a richer sleep diary (latency, awakenings, naps, perceived rest), with careful privacy wording.

### Philia

Already strong: people, birthdays and dates, remember lines, gifts, time together, keep-in-touch rhythms, Compass import, photos, contact/message/email actions, reminders, and year facts.

Most valuable gaps:

- Contact import and two-way contact changes; the phone/contact path is still an owner test item.
- A proper interaction log for calls, messages, visits, and notes, rather than links that launch the phone’s apps.
- Shared household/family access with per-person privacy, or a clear statement that Philia is personal-only.
- Photo backup/sync remains open. Each person can now save and restore their photo with its metadata in one archive.
- Better review of history: last interaction, next date, gifts given, and notes in one person timeline.

### Ergon

Already strong: repeat rules, day-of chores, skip/done, turns, ideas, names, household sharing, reminders, and 30-day facts.

Most valuable gaps:

- Household roles, invitation management, permissions, and a clear shared/private boundary.
- Checklists, notes, photos, dependencies, and room/area views for larger jobs.
- Assignment and review history beyond a small “who did what” summary.
- Bulk import/export and a printable household plan.
- More robust shared notifications once the server migration/function is live.

### Therapeia

Already strong: scheduled doses, waking/sleep anchors, courses, as-needed spacing, supply/refill facts, taken/skip with undo, visits/questions, health card, readings/charts, print, and reminders.

Most valuable gaps:

- Prescription/medicine photo attachments, barcode or medicine lookup, and a safe source for names and instructions. Interaction checking needs a verified medical data source and careful scope.
- Caregiver sharing and an export designed for a clinician/pharmacist, with privacy controls.
- A fuller medication history: changes, stopped/restarted courses, refill events, and plain adherence facts.
- Health-device import for readings, and CSV/JSON export.
- Stronger emergency/privacy affordances for a health app: app lock behavior across companion PWAs, quick access to the health card, and a clearly tested phone-replacement flow.

### Dynamis

Already strong: research-sourced plans, home/gym/bodyweight options, alternatives, progression, warm-ups, rests, mobility, figures, session drafts, after-session reflection, charts, Askesis connection, and reminders.

Most valuable gaps:

- Custom exercises and custom programs. The current library is useful but fixed.
- Video or richer movement instruction; figures explain shape but not every common form mistake.
- Wearable/health integration and export.
- Editable workout history, per-exercise trend views, and a plate/load calculator.
- Reliable background rest timer and audio behavior on each target browser/device.

### Ktema

Already strong: belongings, categories, make/model/serial, warranty and renewal dates, odometer-based upkeep, documents, photos/PDFs, OCR for model/serial, sharing, printing, year facts, and reminders.

Most valuable gaps:

- Files and photos remain device-only and excluded from backup/sync. Each thing now offers Save a copy and Restore a copy archives; an encrypted account copy would remove the remaining product risk.
- Receipt/manual OCR can extract dates, prices, warranty terms, and serials with a review step.
- A stronger household inventory model: shared access, rooms, ownership, replacement value, and insurance export.
- Depreciation, purchase history, and renewal/subscription tracking as plain records.
- A bulk export containing metadata and files.

### Phyton

Already strong: species notes, light/dryness/feed guidance, adaptive watering checks, rain and heat context, plant photos, identification, shared home, sitter sheet, reminders, and year facts.

Most valuable gaps:

- Plant photos remain device-only and excluded from backup/sync. A plant page now offers Save a copy and Restore a copy archives with dates and images; an encrypted account copy remains open.
- Pest/disease tracking, repotting/propagation, fertiliser history, and a richer care journal.
- Room/window/bed layout and filters by location, light, or caretaker.
- Photo identification is unavailable until the production `PLANTNET_KEY` is configured; this needs a visible setup state and a graceful fallback.
- Weather failure/precision states need clearer user-facing handling, especially for outdoor plants.

## Recommended order

1. **Release hardening:** finish server setup, run the real-device matrix, add app/settings/account smoke tests, and extend the sync/reminder diagnostics across the family.
2. **Data safety:** finish encrypted account copies for the device libraries; Save a copy and Restore a copy archives now cover Askesis music, Ktema files, Phyton photos and Philia photos, while Theoria, Proairetos attachments and the warnings are in place.
3. **Diaita phase two:** extend the new side-by-side facts, experiments, and sourced suggestions to Dynamis, Hydros and the remaining sleep signals; Worry time and room guidance are in place.
4. **High-value integrations:** health/wearables for Askesis, Hydros, Diaita, Therapeia, and Dynamis; bank/receipt workflows for Oikonomia; OCR recipe cards for Soma; contact import for Philia.
5. **Collection depth:** custom workouts/programs, pantry/barcode flows, finance forecasting, study card/library management, household permissions, plant care journal, and structured exports.
6. **Commercial layer:** define what a paid plan unlocks, add entitlement checks and restore behavior, then gate only features that have enough reliability and support around them.

The product already has a coherent point of view and unusually broad coverage. The next quality jump comes from making the data recoverable, the server paths observable, the companion apps dependable on real phones, and the strongest unfinished workflows complete before adding more surface area.
