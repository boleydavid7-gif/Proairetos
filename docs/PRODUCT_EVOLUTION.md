# Product evolution

The weekly cycle (the owner's standing request, Nov 5, 2026): research the field, review the apps, propose a short list,
wait for approval, build what is approved, record it here. Continuous improvement, not constant change: keep what works,
every update has a clear purpose, nothing unrelated, Lamplight and each app's own identity kept, tests and regressions
checked, `CLAUDE.md` and What's new updated when something ships. Do not repeat a recommendation unless something has
materially changed.

Each week: Research (what moved in the field), Proposals (app, update, problem, how, why, competitive relevance,
complexity), then the status lists below.

## Status lists

**Proposed, waiting:** see the latest week.
**Approved / in progress:** none.
**Completed:** proposals 2 and 3 (Nov 5), energy removal (Nov 5).
**Rejected:** proposal 1 (top bar on CSS scroll timelines): measured and not worth it (see log). Anything that rates how much a person can do (energy word). Askesis "ease a hot run in one tap" (Nov 5): a run can be indoors, so heat is not a reason to change the session. Hiding Daily practices rows for apps not set up (Nov 5): an app not added never shows, and adding one is the person's choice, so its first row is its way in.
**Worth revisiting:** CSS scroll timelines for the bar once the title's handoff no longer needs the JavaScript classes (`is-folded`, `is-over-picture`).

## Week of Nov 5, 2026

### Research

Search results this week were thin on dated 2026 news; what is below is what held up. Verify against vendor release
notes before relying on any single claim.

- Things 3.22 moved to Liquid Glass with four icon looks (default, dark, tinted, clear); Apple's own Reminders took the
  same look, and iOS 26.1 added a switch for how strong the glass is. Reading: people want a say in how transparent the
  system is. Proairetos already has Room, Color, More contrast and Reduce transparency, so nothing to chase.
- Sunsama's guided morning pass (yesterday's leftovers, new items, durations, drag onto the calendar) and Reclaim's
  automatic scheduling are the two poles of day planning; Sunsama raised its price to about $20 a month. Todoist Pro is
  about $5 a month.
- Web platform: View Transitions and scroll-driven animations are now in all three engines per a 2026 secondary source
  (not confirmed on MDN here; check caniuse before building); Interop 2026 lists both as focus areas.
- Not found: reliable news on Strava, Oura or Apple Health changes, Badging or Safari PWA changes.

### Proposals

1. **Top bar and title fade on CSS scroll timelines** (every app's phone bar, `lamplight/behaviors.ts`, `bars.css`).
   Problem: scrolling still runs JavaScript each frame to fade the title and bring in the bar's glass. How: express the
   fade and glass as `animation-timeline: scroll()` animations, keeping the current JavaScript where the browser lacks
   it. Why: smoother on slow phones, less battery, fewer chances of the bar drifting (a source of earlier iOS bugs).
   Competitive relevance: matches the native feel Things and Reminders have on iOS 26. Complexity: medium (iOS Safari
   needs a real-device check). Confirm support first.
2. **Finish child limits in the screens** (Oikonomia, Poreia, Phyton, Therapeia, Proairetos to-dos). Problem: the device
   already drops a child's forbidden writes, but the controls still show and do nothing. How: use
   `useListPermissions` to hide or disable them, as Soma's list and Ergon already do. Why: a control that does nothing
   is worse than none, and it completes the Family feature. Competitive relevance: Apple Family and Google Family Link
   both hide what a child cannot do. Complexity: medium.
3. **Place several to-dos in open time at once** (Proairetos Today, Open time). Problem: giving each to-do a time is
   one tap per item. How: after choosing the to-dos in Today's list, a preview lays them into the open gaps (the person
   moves or removes any), one Save, one undo; nothing is chosen or ranked by the app. Why: the part of Sunsama people
   value, without its ritual or an AI deciding. Competitive relevance: Sunsama, Reclaim, Motion. Complexity: medium.
   Product-rule check: it only places what the person picked, so it stays "shows and offers".

### Watch list

- Cross-document view transitions and Interop 2026 (already used for app-to-app).
- Strava API terms (still on hold, see Askesis).
- Anything Apple announces for Reminders or Health.

### Status this week

All three proposed, waiting for approval.

### Update log

- Nov 5: proposal 2 (child limits in screens) approved and built: Oikonomia bills and expenses, Poreia trips, Phyton
  plants, Therapeia medicines and Proairetos's shared to-dos hide or disable what a child's level forbids
  (`useAppPermissions`, `SwipeRow off`). Test `src/tests/household/childControls.test.tsx`.
- Nov 5: proposal 3 (several to-dos into open time) approved and built: Today's Open time sheet has Several; picks stack in
  30-minute steps from the chosen time (`stackedStarts`), one Set, one undo. Tests `src/tests/rhythm/stackedStarts.test.ts`.
- Nov 5 (owner's direction, unplanned): the energy word and the "takes little energy" mark are removed everywhere (Open time, item sheet, Today's to-do, Diaita check-in, What's included, Soma's link to it). Rejected for good: anything that rates how much a person can do.
- Nov 5: proposal 1 measured, not built. Scrolling a settings page 180 frames at 4x CPU slowdown cost 151 ms of script
  (under 1 ms a frame, including the test's own loop). The handler already reads one rectangle a frame and writes only
  when a value changes. A CSS scroll timeline could not remove the scroll listener either: it also sets `is-folded`,
  `is-scrolled` and `is-over-picture`, and the handoff follows each page's title position. A rewrite would add risk on
  iPhone, where it cannot be checked here, for no measurable gain.
- Nov 5: review and sweep pass over every app on phone screenshots (dark and light). Fixed: Add buttons stranded above titles in Ergon, Philia, Ktema, Therapeia (3 pages) and Oikonomia (2 pages) now sit in the phone top bar; Ergon's empty Today title reads "Today"; open time's Set button uses the main button style. The visual-check harness now seeds Store ownership. Open question for the owner: Today's Daily practices rows ("Start a running plan", "Log last night's sleep") ask for action on a blank day.

## Week of Nov 12, 2026 (early round, Nov 5)

### Research

Mostly secondary sources again; verify before relying on any single claim.

- Runna (owned by Strava, still a separate app) added Adapt for Heat (paces for heat and humidity), upcoming plans
  scheduled in advance and rebuilt beginner and return-to-running plans (8 to 16 weeks). Strava's Instant Workouts draw
  on Runna's library. A blog reports Garmin buying TrainingPeaks (unconfirmed).
- Monarch and Copilot lean on AI: Copilot's categories learn from the person's behavior, Monarch has Goals 3.0 and a
  $199 a year tier. Not for us: our areas already learn from the person's own moves, on the device, with no AI choosing.
- Readwise's mobile app was rebuilt (Readwise 2.0) with Quick Lookup and new capture; Reader added word lookup and
  Markdown uploads. Theoria already looks words up and reads Markdown.
- Measured, not read: Proairetos's first page is at the edge of the speed budget (first paint about 1.0 s, largest
  paint 1.37 to 1.42 s against 1.0 and 1.4; the other apps pass).

### Proposals

1. **Proairetos starts under budget again** (first page of Proairetos). Problem: first paint is about 1.0 s and the
   largest paint 1.37 to 1.42 s at four times slower CPU, the heaviest app and now at the limit. How: find what grew in
   the first chunks (the shared `apps` chunk is 255 KB) and load what Today does not need at once after first paint, as
   the daily copy already does. Why: the speed budget is a promise; trim before it slips. Competitive relevance: Things
   and Reminders open instantly. Complexity: low to medium.
2. **Ease a hot run in one tap** (Askesis, the run's weather note). Problem: when the forecast is hot the note names the
   conditions and its source, but easing off means opening the session and choosing Lighter today. How: the note carries
   a Lighter today button; the person taps it or not, with undo. Why: Runna's Adapt for Heat is the first thing people
   point to; ours stays the person's choice and sourced, never an automatic change. Complexity: low.
3. **Daily practices only shows what is set up** (Proairetos Today). Problem: on a new day with the apps added but not
   set up, the rows read "Start a running plan", "Set up strength training" and "Log last night's sleep", each asking
   for something. How: an app with nothing chosen yet shows no row; once a plan, goal or log exists the row shows as now.
   Why: the product rule is that nothing asks for attention unless the person chose it. Complexity: low.

### Watch list

- Garmin and TrainingPeaks (unconfirmed), Strava's strength overhaul and Runna's upcoming plans.
- Readwise 2.0's capture; ChatGPT Personal Finance (unverified). Neither changes how we keep money or reading private.

### Status

Proposals 2 and 3 rejected by the owner. Proposal 1 approved and built (see the update log).

### Update log (second round)

- Nov 5: proposal 1 built. The item, decision, search, command palette and shared-text sheets load after first paint
  (`laterSheet`), with the same idle fetch as the later pages and no visible change. Proairetos's first chunk went from
  290 KB to 252 KB; the speed check now reads first paint about 1.0 s and largest paint 1.36 to 1.39 s, every app within
  1400 ms (before: 1.37 to 1.42 s, over). Checked in a browser: search, the command palette and the item sheet open
  within the first second as before. Left alone on purpose: tab pages (Days ahead, Compass), which a view transition
  needs in hand, and the quick-sort and add-event sheets, which their pages import by name.
- Nov 5: visual pass (`src/lamplight/modern.css`): folds animate, scroll padding clears the bars, sideways rows snap and fade at the side with more, Journal and Mneme fields grow (`field-sizing`), grouped lists rise in on a page change. Rejected after measuring: `content-visibility: auto` on long lists (a 600-row scroll cost 15 s of work against 3.5 s without it at 4x CPU). Skipped as no change: `@starting-style` on sheets (they already animate in and out). Search fields everywhere now say Search.

## Third round (Nov 5): modern browser features

Proposed, waiting for the owner's choice. Support checked from secondary sources (blogs, compatibility tables), not
MDN or WebKit's own pages; check those before building.

1. `contrast-color()` for text on the lamp's fill and on pictures. Reported in Chrome 147, Firefox 146, Safari 26. Keep
   the scheme's 7:1 and 4.5:1 tests as the check and the current color as the fallback. Small.
2. Popover API plus anchor positioning for the long-press menu, floating panels and row menus (popover: every browser
   since 2025; anchor positioning: Safari 26, Firefox 147). Less JS positioning; keep the current menu as fallback. Medium.
3. `scheduler.yield()` in sync, search and list builds (INP). Safari support not confirmed; fall back to a timeout. Small.
4. WebGPU for Mneme's Whisper (reported 3 to 10x over WASM; Safari status disputed). Behind a feature test, WASM stays;
   needs the pinned transformers 3.8 checked first. Medium to large.
5. Prerender behind a `document.prerendering` guard (sync and writes wait for activation) for app-to-app switches.
   Chromium only, so it helps Android and desktop; Safari ignores it. Medium.
6. Customizable select (`appearance: base-select`): Chrome 135, Safari 27 (disputed), Firefox no. Plain select elsewhere. Small.

Rejected for now: `corner-shape: squircle` (Chromium only, about 65% of people; could be added later as a pure
enhancement), `interestfor` (Chromium only), `Temporal` (Safari holds out; our `dates.ts` works).
Not yet checked: Navigation API and `CloseWatcher` for the back stack, Background Fetch for the Whisper model,
Origin Private File System for book files.

### Update log (third round)

- Nov 5: proposal 3 built (`src/core/yieldToMain.ts`: `scheduler.yield()` with a timeout fallback, `makeSlicer` hands the
  thread back after 24 ms of work). The sync engine's local snapshot and pull loops use it, so a tap is answered during a
  big sync. Search also keeps each thing's normalized words (`wordsOf`, a WeakMap), so another letter no longer
  normalizes every record again.
- Nov 5: proposal 1 looked at and left alone. The scheme already computes a tinted ink for the lamp's fill that
  reads 4.5:1 or better; `contrast-color()` gives only black or white, a plainer look for no gain, and the person's
  tag colors draw dots and edges, never text on a fill. Worth revisiting if text ever sits on a chosen color.

## Fourth round (Nov 5): scanners for bills and receipts

Proposed, waiting for the owner's choice. Today: Tesseract (English) with a global gray and contrast filter, default page
mode, one pass (`app/family/ocr.ts`); phone apps use Apple Vision / ML Kit. Parsing (`core/ocr/labels.ts`): the amount is
the largest decimal on the page (a receipt's cash tendered can beat the total), no merchant, a due date only on a line
that says due. Support and accuracy figures below come from blogs and vendor pages, not benchmarks; measure on a real set.

1. Read the total by its words (a ranked list: grand total, total, amount due, balance due; skip subtotal, tax, change,
   cash, tendered, savings; a number on the line after its word; largest only as the last resort). Pure code, testable.
2. A small test set (30 to 50 of the owner's real bills and receipts, text kept, no images committed) so every later change
   is measured field by field.
3. Preprocessing: page mode for one column (try 4 and 6), adaptive threshold instead of one contrast value, deskew;
   then, if the set shows it helps, edge detection and perspective correction (OpenCV.js, loaded only when scanning).
4. PDF and QR bills: a PDF's own text (pdf.js is already in Theoria and Poreia) read by the same parser with no OCR; a
   QR on the page (Swiss QR-bill, EPC) read by BarcodeDetector where it exists, `barcode-detector` (ZXing WASM) elsewhere.
5. A better engine on the device: PP-OCRv5 on onnxruntime-web (already served at `/ort/` for Whisper); reported far
   better on receipts, model size unverified. Behind a feature test, Tesseract stays as the fallback.
6. Chrome's Prompt API (image input, text out only) to propose fields from a photo, only when the person taps it; not
   on iPhone or Android Chrome yet.
