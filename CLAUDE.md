# Proairetos: notes for Claude

A personal operating system for intentional living: organizer + Stoic
reflection + mindfulness + ADHD-friendly design. Mobile-first installable
web app (React 19 + Vite + TypeScript), local-first with optional
end-to-end encrypted sync (Supabase).

Read `docs/PRODUCT_ARCHITECTURE.md` before changing behaviour. Its core
rule: **the system records life; it does not interpret life.**

## Non-negotiable product rules

- No scores, streaks, rewards, "overdue", failure states, or shame language.
  Relief instead of praise (calm close-out with undo).
- The app never decides what matters, ranks priorities, infers mood, or
  gives unrequested advice. The person chooses; the app reflects back.
- Banned words are enforced: `src/core/rules/languageRules.ts`, and a test
  scans **every source file, comments included** (overdue, failed, stalled,
  lazy, avoiding, behind, should). Reword rather than disable.
- Capture first; sorting optional. Values are user-chosen (max five).
- Universal: for anyone, on any schedule or none. UI wording stays
  neutral (work, study, care); never assume a 9-to-5 or shift work. The
  owner's 28-day days/evenings/nights rotation (from Tue 2026-09-29) is a
  demanding test case, not the target.
- Never a chore: everything is offered, never asked twice; nothing
  piles up or needs catching up; one tap, under a minute.
- No reassurance lines anywhere, the welcome back included (owner's rule): say the fact ("It has been 17 days.") and the
  actions. Things that pile up are what sorting is for; counts on Today's folded chips stay.
- Wording: short and functional, like Things, Todoist, Apple Reminders, Strava, Paprika, Kindle. Optional fields say "(optional)", not "if you like"; titles are names ("New highlight", "Add a book"), not sentences with a full stop; no reassurance lines ("nothing is counted", "whenever you like"), no "quietly", "gently" or poetic taglines outside the welcome screens.
- American English everywhere (color, center, favorite, tire, canceled, practice, "comes around", cilantro, fiber).
  Readers of outside text (Soma's ingredient lines, statements, photo text, calendar files) still accept British
  spellings; cited paper titles stay as published.
- Every sheet/screen must be leavable: Close/Cancel, swipe down, back
  gesture. Deleting anything offers undo.

## Commands

```
npm install
npm run dev          # local dev server
npm test             # vitest (300+ tests), includes the language guard
npm run lint         # oxlint (correctness)
npm run typecheck
npm run check        # lint + typecheck + tests, as CI runs them
npm run build        # tsc + vite build into dist/
npx wrangler deploy --dry-run   # validate the Cloudflare Worker config
```

## Deploying

- Cloudflare **Worker** (static assets) connected to GitHub; pushes to
  `main` deploy. The site is https://proairetos.com (custom domain on
  the Worker); https://proairetos.boleydavid7.workers.dev is the old
  address and shows a "moved" notice (`app/MovedNotice.tsx`), since
  browser data does not cross addresses (backup, then restore).
  Config: `wrangler.jsonc` (single-page fallback; `worker/index.ts` handles
  only `/api/*`). `public/_headers` keeps
  `sw.js` and the shell uncached; do not add long "immutable" rules for
  `/assets` (unknown paths serve the app page).
- The user deploys from `main`. Work on the session branch and push to
  both the branch and `main` once checks pass.

## Desktop, safety and checks

- From 62rem wide the tab bar becomes a left rail and sheets centre
  (`styles/parts/30-desktop.css`, `data-route` on `.app-shell`); phones are
  unchanged. Keys 1-4 jump between the main pages and `/` opens search
  (`app/shortcuts.ts`), never while typing or in a dialog.
- Askesis has a full desktop layout (`askesis/styles/desktop.css`, scoped to `:root.askesis`): wide banner and
  two-column Home (`home-top/main/bottom` wrappers), article grid, Train with a sticky summary, Progress in
  columns, two-column More, reading column for articles. Phones are unchanged.
- Desktop for the other apps: Askesis, Soma and Oikonomia share one block at
  the end of `askesis/styles/askesis.css` (rail via `.tab-bar`, brand from
  `--app-name`, wider `.shell--tabs`); Soma centres its sheet; Hydros has its
  own block in `hydros.css`; Praxis and Theoria already had side navigation.
  Askesis's and Soma's phone-dock rules (`.askesis .tab-bar`, `.soma .tab-bar`: six-column grid,
  sliding mark) sit in `@media (max-width: 61.99rem)`, since their higher specificity broke the rail;
  keep app-scoped dock rules phone-only. Checked by screenshots before/after: phones byte-identical.
- Sync carries two more kinds of record (migration `20261016000000_preferences_files_sync.sql`,
  held in `laterCollections` until the server has it): `preferences` (every setting in browser
  storage that `syncedSetting` allows, one record each; device-only ones such as sign-in
  and the weather place stay home; on a fresh device the account's copy wins the first time) and
  `attachments` (details as records, bytes sealed with `sealBytes` into the private
  `proairetos-files` bucket by `attachmentFiles.ts`). Both are added around the database store in
  `deviceRecords.ts`. Pulls start 200 numbers back (`OVERLAP`) because the server numbers a write
  before it commits. A record edited on two devices keeps this device's version, and the Account
  page says so (`SyncResult.kept`). CI also runs the tests in two non-UTC time zones.
- Praxis and Theoria's phone bar sits along the bottom edge like the family's others (drawn icons, no
  text glyphs); Theoria fills a book's title and author from the file; Hydros shows what was drunk with
  no target until the person chooses a daily amount (`goalChosen`).
- Praxis stays a dark study room in either appearance, like Theoria (`praxis/main.tsx` sets `data-theme` dark after `applyAppearance`; text size still follows). On computers the rail names Askesis, Soma, Oikonomia and Hydros, so the name over their pages is hidden; welcome buttons stay 26rem wide.
- `src/styles/premium.css` is the shared finish for all ten apps (imported last in each `main.tsx`):
  card depth tokens, balanced headings, tabular figures, selection and focus colour, grain over the
  home photos (`.hero::before`), the `.skeleton` shimmer for waiting. Add new shared polish there, not
  per app. `tap()` (Gentle taps) also fires on groceries ticked, bill paid, drink saved and a study start.
  Each manifest carries real screenshots (`public/<app>/screenshots/`, webp) for the install prompt.
- Dark Today (`Landscape`) and Compass's `PageHero` show `sunrise` / `sunrise-wide` (941×1672 / 1672×941, true colour, a light filter only; light mode keeps `morning`). Contrast was raised app-wide: brighter muted and faint text (8.6:1 and 6.8:1 on cards in dark), clearer card borders and surfaces, a soft text shadow over Today's landscape; axe finds no colour-contrast violations on the main pages.
- Every picture in the family is a flat drawn scene (layered ridges, firs, sky, sun or moon, still water, grain), made by `scripts/scenes/` (`engine.mjs` kit, `all.mjs` for the older apps' scenes, `new-apps.mjs` for Diaita, Philia, Ergon; PNG out, then webp at quality 85), with the same names and sizes as the photos they replaced. Pictures in `assets/images/scenes/`: portrait `valley`, `lake`, `forest` (852×1846; forest is the Journal) and wide `valley-wide`, `lake-wide`, `forest-wide` (1672×941) which show on computer-sized screens:
  an element sets `--photo-wide` inline and `premium.css` swaps it in from 62rem; Oikonomia's heroes use `<picture>`.
- Light mode shows the morning photo (`morning`, `morning-wide`) in the same places as dark's landscapes (Today's `Landscape`, Compass's `PageHero`, the Journal banner): those elements also set `--photo-light` / `--photo-light-wide` and `premium.css` swaps them in for light (and System when light), true to colour. Meditate (page, sit screen, Reflect's card) shows `lake-light` / `lake-light-wide` in light, toned down (`premium.css`) because its words stay light. Main cards in the Proairetos shell are solid (`Surfaces` in `premium.css`; frosted glass on every card read as a template); only the tab bar stays see-through.
- Notices and push always go through Proairetos's `/sw.js` (scope /), whatever app is open (`app/notify/familyWorker.ts`, used by `notifications.show` and `enableReminders`): Hydros, Askesis, Soma and Oikonomia have their own workers for their pages, which cannot show a push. A tap goes to the app the notice belongs to (`placeFor` in `sw.js`). The shared worker and in-app notices use the source app's name and icon; private lock-screen notices keep the app label and time. The family list is one component in every app (`app/family/FamilyApps.tsx`); apps without the shared stylesheet (Praxis, Theoria, Hydros) wrap the account card, backup card and list in `.family-surface` (styles in `app/family/account.css`). Theoria's settings (`theoria:`) are in backups and sync. Every app's manifest has shortcuts.
- Account's System check shows connection, sync state, reminder availability, browser storage and web reminder setup; Check again re-reads the account and browser state after a device permission change.
- Device-only Askesis songs, Ktema files, Phyton photos and Philia photos each have a Save a copy archive with a manifest and a Restore a copy action on the matching record; encrypted account copies remain future work. Theoria books already have an opt-in sealed copy in the person's own storage.
- Reminders from every app (migration `20261017000000_reminder_sources.sql`, preview migration `20261022000000_reminder_previews.sql`, function redeploy): server rows carry a `source` (proairetos, askesis, oikonomia, hydros, praxis, diaita, philia, ergon; `core/notify/sources.ts`) and `sealed` words (`sealNoticeWords`, account key, AD `proairetos-notice`). `updateReminders` in `syncController` writes only the sources this app owns (`sourcesToWrite`: each app its own; Proairetos also Askesis/Oikonomia/Hydros when it holds their data or wrote them before; Praxis's running block only from Praxis), replacing that source alone (`replaceSourceReminders`), whenever the account has a push subscription anywhere (`hasPushSubscription`). Reminder status checks the actual service-worker subscription as well as its local marker. `send-reminders` sends the sealed words as the payload (`{v:1,n:[...]}`); `sw.js` opens them with the `dataKey` from IndexedDB `proairetos`/`syncMeta` and shows each app's own words and icon. When "Details on the lock screen" is on, the optional preview columns let an iPhone's Declarative Web Push show the same app name, icon and reminder line even when the worker cannot wake; with it off, the preview stays empty and the generic line remains. Apps other than Proairetos do not create a second push subscription when the account already has one (no double notices on iPhone). Without the preview migration, the writer drops only the preview columns and `send-reminders` asks for `sealed, source` (step down one level at a time, never straight to plain pushes); the push is labelled by the first due row from an app other than Proairetos. Without the sources migration, Proairetos keeps the old replace-all. Once a session, on sync, `keepPushSubscription` re-subscribes if the phone dropped the subscription and re-saves it to `push_subscriptions` (the server deletes one that answered 404/410, while the device still said "on").
- Your own storage (migration `20261021000000_storage_links.sql`; Worker `/api/storage`, `worker/storageToken.ts`, secrets
  `GOOGLE_DRIVE_CLIENT_ID/SECRET`, `DROPBOX_APP_KEY` (+ optional secret), `ONEDRIVE_CLIENT_ID/SECRET`; GET lists the ready ones):
  sealed records can sync through the person's Google Drive (a visible "Proairetos" folder, scope `drive.file`), Dropbox or OneDrive
  (a "Proairetos" folder in the app folder: the registrations are Noesis's, ids in `wrangler.jsonc` vars, `keep_vars`; Google's
  id and secret are Worker secrets; OneDrive without a secret is a single-page registration traded in the browser, `direct`)
  instead of the `records` table. `data/sync/folderRemote.ts` is a `RemoteStore` over a flat `CloudFolder`: each device writes
  its own `log-<device>-<n>.json` files, every record carries its write time `t` (never below one already seen), newer wins,
  a device folds only its own files (over 24); `finish()` after the engine keeps what was read. Photos as `file-<id>`.
  Providers in `storageProviders.ts`; PKCE sign-in in `storageLink.ts` (return page `public/storage-connected/`, forwards the code
  in the fragment to `/?open=account`; `takeOpening` keeps the fragment). The choice is the `storage_links` row with the refresh
  token sealed (`sealRecord` 'storage'/'link'), so every app and device follows (`app/sync/ownStorage.ts` `ownStorageFor`, read every
  5 min; a change resets the cursor and folder state but keeps fingerprints). `moveStorage` syncs where it is, saves the
  choice, clears fingerprints (`startAfresh(..., true)`) so everything goes to the new place, then removes the server copy
  (`removeServerCopy`). UI `features/settings/StorageChoice.tsx` in Account, shown only when a provider is set up.
- Front pages are generated: `node scripts/welcome/build.mjs` writes `public/welcome/index.html`, one page per add-on
  (`/welcome/<app>/`: the app's own colors, what it does, screenshots, the waitlist, the family), `/welcome/thanks/`,
  `/welcome/try-again/` and `public/sitemap.xml` from one list in the script; edit the script, never the pages. The
  waitlist form (plain HTML, no script) posts to `/api/waitlist` (`worker/waitlist.ts`: same origin, a hidden field for
  bots, rate limited) → RPC `join_waitlist` (migration `20261026000000_waitlist.sql`, table closed to the API).
  `sw.js` keeps every `/welcome/…` page as itself, never as the app.
- Front page `public/welcome/index.html` (served at `/welcome/`, static, no script): the ten apps with their screenshots, how to add each to the Home Screen (iPhone, Android, computer), and the privacy promises. Linked from the Store ("Adding an app to your Home Screen") and the privacy page; `sw.js` keeps it in `STATIC_PAGES` so it is never cached as the app.
- Sign in with Google or Apple (optional, `VITE_SIGN_IN_WITH`=`google,apple`, providers set up in Supabase per docs/SERVER_SETUP.md): `ProviderButtons` (`app/family/ProviderButtons.tsx`) above the email code in Proairetos's AccountSection and every family AccountCard; `signInWith` returns to that app's account page (`?open=account|more|settings`); `resolvePhase` tidies the tokens from the address; Proairetos skips the welcome when opened with `?open=account`. The passphrase still unlocks the data. Hydros reloads on a new worker only when one was already in charge (a first install kept losing `?open=`).
- Store, stage 1 (`app/family/added.ts`, `features/settings/StoreSection.tsx`, view `store`, `?open=settings:store`): Proairetos is the main app and the other nine are added from its Store (all free for now). What is added is the synced setting `proairetos.apps` (`{added}`); the first time on a device it is the apps with traces in browser storage (`usedApps`), decided by `app/family/decideAdded.ts`, imported first in every app's `main.tsx` so the app's own first writes never count. An app opened while not added shows `AddedOnly` (`app/family/AddedOnly.tsx`, self-styled in `addedOnly.css`: logo, name, line, Add, a link to the Store) in place of itself, and follows a removal made elsewhere at once. An app not added stays out of Today and What's included (`PART_APP` in `useTodayParts`), notifications (`isAdded` in `upcoming.ts`, `familyNotices.ts`) and search; its records are kept. Each Store card leads with the app's logo and name on its own colours (`tint` in `familyApps`). Proairetos's bar ends with Apps (`components/layout/AppsTab.tsx`, a fifth place; the bar grid is five columns, labels `nowrap` at `min(0.8rem, 3vw)`), which opens a grid of added apps plus Store. Every other app's bar ends with Proairetos (`app/family/ProairetosTab.tsx`: a link to `/` with the compass mark, in the shell `TabBar`, Askesis, Soma, Oikonomia, Hydros (4 columns), Praxis (7 columns, 9.5px labels) and Theoria's phone bar (6 columns); `.proairetos-tab` in `premium.css`). Other apps' `FamilyApps` list shows Proairetos, added apps and a Store row. Styles in `parts/31-store.css`. Payment and server checks are later stages.
- Store, stage 2 (payments; `worker/store.ts`, `app/family/purchases.ts`, migration `20261025000000_purchases.sql`, steps in
  SERVER_SETUP.md "The Store"): Proairetos free, each add-on $4.99 once through Stripe Checkout (`price_data`, no Stripe
  products to set up). `GET /api/store` says whether it is paid (only when `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` are all set; until then everything stays free);
  `POST /api/store/checkout` (Bearer sign-in) returns the Stripe address, back to `/?open=settings:store#bought=APP`
  (`takeBought`, `waitForPurchase`, then `addApp`); `POST /api/store/webhook` checks Stripe's signature and writes
  `purchases` with the service role (ignore duplicates); people read their own rows by RLS. Beta testers: Worker secret
  `STORE_TESTERS` (emails, comma-separated), checked on the Worker against the signed-in email (`GET /api/store/mine`,
  `isTester`), so checkout answers `owned` and the device marks `tester`. Device caches `proairetosStore` and
  `proairetosOwned` (outside `proairetos.`, so not synced or backed up) let `mayUse` decide at once; `isAdded` and
  `addedSnapshot` require it. `AddedOnly` asks again on showing and offers "Get it" when paid and not owned.
- Polish pass: one welcome pattern (`Welcome` in `shell.tsx`, and the Askesis, Soma, Oikonomia welcomes): picture, mark, name in serif, one line, about, Begin, left-aligned at the foot; no by-line, slogan or fine print. "by Proairetos" stays only in the Store and `AddedOnly`, never in an app's own header. Home titles name the content (Askesis the week, Soma "Recipes", Oikonomia "This month"); headings carry no full stop. Today's header shows one prompt at a time and the daily thought sits at the foot over `Landscape`. Font sizes use the type scale in `premium.css` (`--text-xs` .75 to `--text-4xl` 2.3rem); use a token, not a new rem size.
- Icons (`scripts/icons/`: `glyphs.mjs` is the system, `build.mjs` writes every file; run `node scripts/icons/build.mjs`): a 1024 canvas, a tile in the app's own colour lit by Lamplight's lamp from the upper right (one soft wash of warm light, no ring;
  shadows fall down-left; Proairetos ink with the gold compass, Soma the one light tile), one solid warm-white glyph with a tinted second layer, all on the same keylines inside the maskable circle (radius 410). Each app gets the rounded SVG (`icon.svg`, Praxis and Theoria `favicon.svg`, Proairetos also `favicon.svg`), rounded `icon-192/512.png`, full-bleed `icon-maskable-512.png` and `apple-touch-icon.png` (180). Glyphs (sized to the same optical weight; check them side by side at 60 px): compass, mountains and sun, a steaming bowl (Phyton keeps the plant in a pot), coins, drop, hourglass, open book, moon, two circles, house with a tick, capsule, kettlebell, box, sprout. After changing icons, bump each app worker's `CACHE` (they keep icons cache-first). Inside the apps the tile is never shown: `FamilyMark` (`app/family/marks.tsx`) draws the icon's symbol in one colour that follows the surface (`MARK_LIGHT` over pictures, `currentColor` on pages, `MARK_COLOR` where it stands alone), the second layer as a lighter shade and thin cut gaps where shapes overlap (like SF Symbols' hierarchical mode). `AppMark`, Askesis `Mark`, Oikonomia `ArchMark`, Praxis/Theoria marks, Soma's and Hydros's brands use it; the tab bar's `ProairetosMark` stays a line icon like the other tab icons. Turn a mark as a whole (`WHOLE`), never per shape: a cut is measured inside the shape's own transform.
- Design pass against template tells (research: AI-made UI shows one radius and card for everything, glass on every card, small uppercase tracked labels, vague subtitles, placeholder rows): section labels are sentence case at `--text-sm` (only weekday heads, the timeline's now, the paused ring and the Nutri-Score badge keep capitals); Capture's kinds are one grouped list with hairlines after the icon (`.kind-list`), names only until something is in them; no taglines under page titles; Days ahead's list shows empty days as their title alone (the month's picked day still says "Nothing set."); button rows keep each label on one line and wrap the buttons instead (`.button-row`); Soma's season row shows photos only. Greetings and headings carry no full stop. Second round: the serif is for page titles, quotes and the person's own words (journal, values, goals, names); card and section headings are the sans, semibold, at `--text-lg` ("One serif rule" at the end of `premium.css`). One quote per app: Proairetos keeps Today's daily thought, and empty Reflect, Capture kinds and Grateful show no `GentleLine` (Lighter view keeps one, as Today's stand-in). Reflect's Meditate and Compass are rows with a small picture in one grouped list (`.reflect-places`, `.place-row`). Home heroes (`.hero--tall`) are a band of `clamp(208px, 28vh, 248px)` on phones (computers keep 380px; welcome screens keep the full scene); home titles are `--text-4xl`.
- Third design pass: an app's empty home is `.card.first-run` (a card like Proairetos's: solid fill, 20 px inside, a defined lit edge; one muted line, a compact button; `premium.css`; with no padding the lit edge drew a frame against the words); the daily thought shows only once the app has something in it and is small and muted; only Proairetos greets (the add-on apps' heroes have no `Greeting`). Praxis ("Today"), Theoria ("Library") and Hydros ("Today") name the page instead of greeting; Philia's empty home is "People". In light mode a home picture's title and line turn dark with a soft light halo over the pale fade ("Light home pictures" at the end of `premium.css`, using `--page-ink`, since `.hero__content` redefines `--text` as the photo color); the top keeps its shade and the app's name stays light. Askesis `.choice-list` is one grouped list with a check on the chosen row; Praxis's top bar holds only the date and its timer shows only with a block; Therapeia's `.dose-time` keeps 8rem for the time.
- The settings look in the other apps (end of `premium.css`, "The same settings look in every app"): `.rows` get a coloured `.row__icon` tile by position (blue, teal, orange, indigo, green, pink; another app's icon image stays bare), hairlines that start after the tile, and `.switch` takes the iOS proportions with a white knob; `.row__select` is a choice at a row's end (Oikonomia's currency and week start, Theoria's theme and font). `.family-surface .rows` is one grouped list too. Theoria's Settings is grouped rows (Reading; Books: sealed copy switch, Bring in highlights, Your year). Soma's More picture fits the page width.
- Settings opens from the person's initial in a round button, top right of every main page (`SettingsButton`,
  `.profile-button`; the gear in the circle when no name is set), as in Apple's own apps. Today groups everything the
  other apps bring into one inset list under "From your apps" (`.today-apps` / `.today-group` in `premium.css`, hidden
  when empty; `FromYourApps embedded` first, then run, sleep, bills, birthdays, study, highlight), with separators
  that start after the icon. Your day carries the countdown on its next entry (`untilText`: exact within three hours,
  then "about N h"), so `NowCard` shows Next only when the day's list has nothing still to come. Today's to-do and the
  intention have no header link until something is set (the row and field are the way in).
- Lamplight, the family's design system (spec `docs/design/LAMPLIGHT.md`, public guide `/lamplight/` from `lamplight/index.html`
  → `src/lamplight-guide/`, a live theme builder): `src/lamplight/` holds the scheme (`scheme.ts`: OKLCH roles from a room seed
  and a lamp seed, each moved until it reads 7:1 / 4.5:1 on every surface; presets kept exactly; `ownLamp(hue)` for "Your own"),
  each app's theme from its content (`apps.ts` `appTheme`: room and lamp from its page colors and accent, so Soma stays its
  garden, Hydros its water), the bridge to each app's own color names (`family.ts` `familyVars`; Praxis and Theoria `ALWAYS_DARK`),
  and `tokens.css` (shape, space, type roles, light for depth, motion), `components.css` (`.ll-*`), `motion.css` (press brightens,
  dims slowly; sheets dim the room) and `adopt.css` (the shared classes every screen already uses take the components' shape,
  light, focus and tonal choices: pill main actions with the lamp's light, tonal chips and quiet buttons, filled fields, hairline
  cards; `:root`-prefixed, layout untouched) and `icons.css`, imported by `premium.css`. Icons: `src/lamplight/icons.tsx` (`LampIcon`: 24
  grid, 1.7 stroke, round ends; `GLYPHS` drawn once; the current tab's icon is lit, filling softly with the lamp); every app's icon
  module draws through it and re-exports the shared glyphs under its own names, so call sites stay the same (tab icons
  such as bills, basket, broom, pill, visit, run, log are shared glyphs with their own lit shapes; Praxis and Theoria use the
  same set). `makeScheme(..., 'deep')` is the premium cut Noesis uses (darker, more distance between layers, finer hairline). Every app's main (or `startApp`) registers
  `withLamplight((look, light) => applyLamplight(look, light, app))`, which also sets the browser bar color. Proairetos takes the
  person's Room and Color (Settings > Appearance; Color can be Your own, `hue:N` with a hue strip), kept in `proairetos.appearance`
  (synced); `app/lamplight.ts` maps the scheme onto `--color-*` and draws the wallpaper (`app/wallpaper.ts`, SVG drawn like a system
  wallpaper: four soft color blooms of the room, the lamp as a warm glow with no rings or hard center, two silk folds
  with a lit top edge and a soft shade beneath, fine grain from `feTurbulence`; tall for phones, wide from 62rem) as `--room-wall` on `.app-shell` (`02-shell.css`). Tests in
  `src/tests/lamplight/`. Gold tints in Proairetos's styles use `--color-accent-rgb`.
  One light per page: the lamp sits above the title and clear of the top-right icons (x .6, y .09 tall; .66/.12 wide).
  Today's foot (`Landscape`) is drawn from the same room (`footSvg`, `--room-foot` / `--room-foot-wide`: two silk folds
  fading into the page over a bloom of the room's color, a rim of the lamp's light, no sun or clouds), and Compass's `PageHero` has no picture of its own
  (the title sits on the wallpaper); Reflect's Compass row shows the room's wallpaper. `sunrise`/`morning` are no
  longer used in Proairetos.
- Lamplight layout and motion (`src/lamplight/layout.css`, imported by `premium.css`): one rhythm for every app
  (`--ll-gutter` 20, `--ll-gap` 16, `--ll-section-gap` 28, `--ll-label-gap` 8) put on the family's own page classes;
  section labels outside their card (`.ll-section-label`, used for "Reminders" in the newer apps' More); text never
  under 12 px, tab labels never under 11 px. `.list-empty` has no box and a sans title. `transitions.ts` notes the last
  tapped card or row and, on a forward move, names it and the new page's head `ll-morph` so the card grows into the
  title; the tab bar's old picture dims slowly while the new one lights (`motion.css`). Scenes have one light at
  `LAMP_X` (.64) with `lampRing`, no clouds (`scripts/scenes/engine.mjs`).
- Lamplight behaviors (`src/lamplight/behaviors.ts`, `bars.css`, started by `applyAppearance`): on phones one bar across
  the top of every page (`.ll-topbar`, `:root.ll-bar-on`): the app's symbolic mark and name on the left (`setBarMark` from `applyLamplight`, drawn by `familyMarkSvg` in
  `app/family/marks.tsx`; light over a home picture's shaded top, `is-over-picture`), or the
  chevron with the back link's words; on the right copies of the page's header actions (`.page-header__actions` etc.)
  and every dock item marked `data-to-header` (More / Settings, Proairetos's Apps, the family's Proairetos link,
  Hydros's gear), each pressing its original. The originals leave the page and dock on phones (visibility hidden /
  `display: none`; docks then lay out their remaining places in columns). Every phone dock (all fifteen apps) marks the
  current place with one line along its top edge in the app's color, centered over the `[aria-current=page]` item:
  `dockMarks` in `behaviors.ts` measures it into `--ll-dock-x` and `bars.css` draws `::after` (never fixed percentages,
  which drifted with each dock's padding); it slides only after the first placement (`ll-dock-ready`). The bar
  names the app only, never the page; it stays clear while the page's title is in view, and its glass fades in over
  40 px of scroll as the title's top edge passes under it while the title fades out (from 8 px on a page with no
  title). The glass is the one blur in Lamplight: the mica at 74% over `backdrop-filter: blur(16px) saturate(1.5)`,
  solid behind the status bar, reaching 24 px below the bar with that foot masked away (no hairline, no hard edge);
  solid mica with less transparency. Scrolling writes `--ll-bar-progress` on the bar and `--ll-title-opacity` on the
  title only, and only when they change (on the root they restyled the whole page each frame and stuttered); a title
  pushed down by padding is measured from its words (`titleInset`). Hidden on welcome, onboarding, `AddedOnly` and full-screen moments. The edge swipe (installed apps) holds the
  page, finishing on a third or a flick, springing back otherwise (Proairetos's back stack through `setSwipeBack` in
  `EdgeSwipe`); `useSheet` takes flicks and lets the backdrop follow (`--sheet-pull`); `useSheet({ from: 'top' })` + `.sheet--top`
  drops a sheet from the top and leaves upward (the Apps sheet, opened from the top bar). Praxis and Theoria text uses
  `--ll-sans`. `version.ts` holds the system's version, shown on the guide.
- The top inset is `--ll-safe-top` (`bars.css`): the status area, plus 6 px on phones while the bar is on, so the bar
  and the page under it sit clear of the edge iOS blurs behind the status bar. Every app's CSS uses the variable, never
  `env(safe-area-inset-top)` directly (the Lamplight guide aside); full-screen moments turn the bar off and get the plain inset.
  `:root` also sets `text-size-adjust: 100%` for every app: iOS text autosizing made the bar's name change size as it folded.
- Scroll cost (checked with 400 chores and people, a year of reflections, 4x CPU slowdown): a scroll frame in
  `behaviors.ts` reads only the scroll and one rectangle; querying the page (full-screen check, actions, back link,
  title, picture) runs only after the page changed (`dirty`). The bar's mica is a `::before` that fades by opacity and
  the docks carry `will-change: translate`, so nothing repaints while scrolling. The daily copy waits until the page has
  been still for 1.5 s and the browser is idle (`whenStill` in `dailyCopy.ts`). A `.page-top` holding only what the bar
  carries is removed on phones (no gap above the title).
- Lamplight 1.3 (materials and touch, `bars.css`, `layout.css`, `tokens.css`, `components.css`, `behaviors.ts`): no blur
  except the phone top bar's glass (a test allows `backdrop-filter` in `bars.css` only): docks are mica (`--ll-mica` from the scheme, `--ll-mica-surface`
  with the lamp washing in; `--color-bar-rgb` and Askesis's `--bar` follow it), content fades into a bar (`--ll-edge-below` /
  `--ll-edge-above`), backdrops are a plain dim. Docks tuck away reading down a page and come back scrolling up
  (`:root.ll-tucked`); the top bar's buttons share one mica pill. Long-press or right-click a row (`.swipe`, `.check-row`,
  `.rows > li`, `.detail-list > li`, `[data-menu]`) for a menu read from the row's own buttons (`SwipeItem`'s action as
  `[data-menu-first]`, checkboxes as Mark done); labels lose the row's own name. Springs: `--ll-spring` / `--ll-spring-lively`
  (CSS `linear()`), which the older easing names (`--ease-out`, `--ease`, `--ease-spring`) now take. Concentric corners
  (`--ll-outer`, `--ll-inset`, `--ll-concentric`) on grouped lists' first and last rows, inset pictures and sheets. One waiting
  mark: `Waiting` (`src/lamplight/Waiting.tsx`, a breathing light) beside "Saving…", "Opening…" etc. Tablets (48-62rem): a
  floating dock pill and a top bar aligned to the column. `forced-colors` gives every surface an edge and marks the current
  place with Highlight. Right to left: `Sym` back/chevron/arrow carry `ll-icon--flip`, and the back swipe comes from the right.
- Lamplight 1.4, Material meets Mica (`src/lamplight/material.css`, imported after `bars.css`; the owner's choice: Material 3
  structure on opaque, room-tinted surfaces, very little transparency): cards and grouped lists are filled tonal surfaces
  with no outline; `.button-quiet` is Material's tonal button (`--ll-tonal`, the lamp mixed 16% into the card, opaque);
  chips take 8 px corners with the tonal container when chosen; every phone dock marks the current place with the lamp's
  line along its top edge (the owner preferred it to a tonal pill): `dockMarks` centers it on the icon itself (`--ll-dock-x`, also
  `--ll-dock-y`; re-measured after a dock transition ends), it slides on `--ll-spring` and stretches 1.75x while moving
  (`ll-dock-moving`, 200 ms); the phone top bar's mica is 94% solid; `--text-xs`
  is 13 px and `--text-sm` 15 px.
  Round 2: Hydros's Today rebuilt on the family hero (`hero hero--tall` with `hydros-sunset`, `home__title`), the day's amount as
  one large figure with a bar (`.hydros-amount`), usual glasses as full-size tonal buttons (`.hydros-glass`), drinks as one
  grouped list (`.hydros-drinks`), the daily thought at the foot once something is logged (`.hydros-thought`); Proairetos's
  own surfaces lose their outlines too; Praxis's add row puts the name on its own line; Theoria shows the sync tag only when
  signed in; Ktema's empty home shows four upkeep ideas and More ideas.
- Lamplight 1.4 motion (`motion.css`, `behaviors.ts` `listMotion`, `lamplight/RollingNumber.tsx`): a press squeezes controls to
  0.96 (rows and cards 0.985) and springs back on release (`scale` only; the old glow filter is gone); lists glide when a tap
  or key adds, finishes, removes or puts back a row (FLIP: positions noted on pointerdown/keydown, replayed as `translate` in
  the next frame for rows in `LIST_ROWS`, new rows fade up; within 1.5 s of the input); a chosen `.chip` grows a check
  (`::before`, masked SVG); switch knobs travel on `--ll-spring-lively`; `RollingNumber` rolls a figure to its new value
  (Hydros's amount; Oikonomia's left to pay and plan total via `oikonomia/app/Total.tsx`, when one currency: `remainingSummary().figure`);
  a removed row fades out in place (`fadeOut`: an inert `data-ll-ghost` copy, fixed at its old rect, at most 3 per change)
  while the rest glide; grids glide too (`GRID_ITEMS`: Soma's recipe cards, Theoria's shelves, Soma's produce, moving sideways as well),
  and the ghost copy drops ids, names and `for`. `RollingNumber` hides its moving figure from screen readers and reads
  only the value it rolls to; it also counts Praxis's week, Askesis's Log tiles, Dynamis's "N of M sets", Poreia's
  So far, Saved and Who paid. Swipe rows (`SwipeItem`, Oikonomia `SwipeRow`) arm once letting go would act
  (`swipe--armed`: the action lights, its mark grows, one `tap()` as the line is crossed). `Placeholder`
  (`lamplight/Placeholder.tsx`: `lines`, `rows`, `cards` on `.skeleton`) stands in while Theoria's library, notes and
  a book open, Poreia's Around first looks and Phyton identifies.
- One undo bar (`src/lamplight/undo.tsx`, `undo.css`): `offerUndo(message, run?, seconds = 7)`, `say` (3 s), `clearUndo`,
  `<UndoBar />`, one offer at a time for the page. Every app uses it: the family shell, Hydros's and Oikonomia's
  `app/undo.tsx` and Askesis/Soma's `UndoProvider` re-export or wrap it, Proairetos's `OverlayProvider.offerUndo`
  passes through, Praxis and Theoria call it, Passkeys calls it directly. It sits 12 px above whatever fixed bar is at
  the foot (measured, stacked bars too), bottom right from 62rem; enters on the lively spring, leaves in 200 ms.
  Do not add another toast.
- Lamplight 1.5: the undo bar is the `.ll-snackbar` component (components.css; `undo.css` only places and moves it);
  `Placeholder` draws `.ll-skeleton` stacks (the older `.skeleton` is gone). Charts (`app/family/charts.tsx`, `charts.css`):
  values travel through `useTweened` (`lamplight/tween.ts`: `from`, `stagger`, `easeSpring`), columns rise from 0 one after
  another with a lit gradient and a hairline cap, the latest column's value on its cap, others step back (0.42) while one is
  read; a line draws in once (`pathLength=1`, the dash only during the animation, fill `backwards`), its wash fades down,
  the newest point ripples once, the readout glides. Bars each app draws itself use `lamplight/charts.css`: `.ll-rise`
  (`--i` stagger), `.ll-grow`, `.ll-lit` (an `::after` light layer, `--ll-lit-angle`, `.ll-lit--end`), `.ll-travel`,
  `.ll-draw`, `.ll-land` (Praxis Time, Hydros Flow and amount, Oikonomia plan, Askesis session bar).
- App identity (`lamplight/identity.ts`, `identity.css`): `APP_IDENTITY` per app (light, wall pattern, tempo, numerals,
  shape accent, signature, character), set by `applyLamplight` as `data-ll-light|pattern|tempo|numerals|shape` and
  `--ll-light-tint`, `--ll-pattern-image` (a 120 x 440 SVG tile fading downward, ink at 5.5% dark / 5% light). The body
  gets the light's pool at the top and the pattern (Proairetos keeps its wallpaper: `none`/`lamp`); tempo overrides
  `--ll-calm`/`--ll-slow`/`--ll-spring`; `.ll-figure` (RollingNumber) follows numerals; `.ll-signature` takes the shape
  accent (Hydros amount bar, Askesis session bar, Oikonomia plan bar). The guide shows every identity (`#identity`) and
  live charts. Only these choices vary; add an app's identity there, never per-app overrides of shared parts.
- Busy-person audit fixes: Today's `CaptureBar` sits first (above the intention). Add forms show only what makes the
  record work and fold the rest under `MoreDetails` (`app/family/MoreDetails.tsx`, `moreDetails.css`; open when editing
  something that has any of them): Ktema thing (name, kind), Oikonomia bill (name, amount, due, repeats), Therapeia
  medicine (name, dose, times, days), Ergon chore (name, repeats, from), Philia person (name, birthday), Poreia trip (where,
  name, dates). Ergon shows a chore's latest turn (`shownDay`: a daily chore left undone reads Today, a weekly one since its
  latest week) in its lists and in From your apps; counting still runs from `nextDay`. Diaita's check-in keeps the night in
  one tap on Well/Okay/Poorly with the planned times ("Other times" opens the fields). Askesis's Begin goes straight to the
  plan; its first step carries the doctor line with a link to Before you start, and "Start now, aim later" starts the
  suggested path. Home heroes (`hero--tall`) use the wide scene on phones too (the band is landscape; the portrait showed
  only sky); Hydros keeps its portrait sunset, which has no wide version.
- Hand-set colors go through tokens: Theoria's sheet uses `--theoria-*` (from `theoriaVars`) and `color-mix()` over them;
  only covers and the reader's papers (`--theoria-paper-ink`, `--theoria-night-paper`, `--theoria-sepia-paper`) stay content colors.
  Hydros's page parts use `--surface-solid`, `--surface-2`, `--cyan` mixes and `--ll-mica` (dock); what sits over its pictures (hero,
  orb, add stage) keeps its photo ink. `hydrosVars` also sets the `--color-*` names the shared family pieces read.
  Praxis uses `--color-accent-rgb`, `--color-surface(-raised)`, `--color-bar-rgb`; its sound pictures stay drawn content.
  Askesis, Soma, Oikonomia and Poreia keep fixed colors only for categories (effort, dish tints, map pins, Strava's
  orange) and the shades over their pictures.
- ADHD audit fixes: `CaptureBar` offers notification permission once, after the first capture with a time while
  permission is `default` (`remindOfferSeen` / `markRemindOfferSeen`, Allow asks from the tap); on Today the capture box
  sits above the day's one message (pause offer, welcome back, values); `NowCard` says when the next thing is with
  `whenText` (a countdown today, else "tomorrow" or the weekday); the values invitation's "Not now" sets it aside for good (`isValuesInviteSetAside`) until values are chosen.
- Page motion: `transition()` (app/transitions.ts) uses view transitions only in Proairetos; elsewhere (and for
  Proairetos's main tabs, which keep the dock out of a snapshot) it calls `markEnter(direction)`, which sets
  `html[data-enter]` before the new page mounts; `lamplight/motion.css` runs one `ll-enter` (from `--ll-enter-x/y`: forward
  +40px, back -40px, tabs ±22px, a first look rising 8px) on `.shell .page-enter`, `.hydros-page-enter`, `.theoria-view`,
  `.praxis-app .praxis-view`; Proairetos's main tabs fade by opacity only (`ll-fade-in`, Today's landscape is fixed). Praxis
  and Theoria mark their own view changes with `useEnterMark(view, tabs)`. Between apps: `@view-transition { navigation:
  auto; types: app }` (premium.css); motion.css names every dock `tab-bar` and the top bar `ll-topbar` so they hold
  still, and under `:active-view-transition-type(app)` the old app eases back (280 ms) while the new one, a live picture
  that fills in as it draws, settles in from 90 ms. Headless Chromium skips many cross-document transitions; check on a phone.
- `scripts/visual-check/` catches visual drift: `shoot.mjs <dir>` photographs every app's places (each dock, rail or
  sidebar item) dark and light, phone (390) and computer (1440), motion reduced and clock fixed; `compare.mjs <before>
  <after>` lists the pictures that changed and writes magenta diffs to `<after>/diff`. Shoot the old build before a change,
  the new one after (runs in `.visual/`, ignored by git; SIZES/THEMES/APPS narrow a run, four runs in parallel take ~2 min).
  Hydros Settings is the family's `.family-surface` grouped rows (`row`, `row__icon`, `row__text`, `switch`); its own
  classes only add what sits inside them (glass editor, units, reference amounts).
- `scripts/layout-check/check.mjs` measures the dock line over its icon, top-bar icons centered and 44 px, and the undo
  bar clear of the dock, in every app, dark and light; run it after layout changes. `tap()` also on `.tick`, chips and Hydros glasses. Reduced motion turns all of it off.
- Icons: `LampIcon` stroke is `strokeFor(size)` (one optical weight); sizes only from `ICON_SIZES` (16, 18, 20, 22, 24,
  28, 32); marks in controls are `<Sym name="close|back|chevron|plus|minus|check" />`, never ×, ‹, +, ✓ typed
  (tested in `src/tests/lamplight/icons.test.ts`). Settings shows a gear in every app (More tabs too).
- Back up and restore (`app/family/FamilyBackup.tsx`, `familyBackup.css`): on an app's settings page `FamilyBackup` is one row
  (last backup date) opening a full page over the app (portal, `.family-data`, one history entry so Back, Escape and the back
  gesture close it; it takes `.family-surface` when the row sits in one). `inline` shows the cards directly, for pages already
  about the person's data (Askesis's and Soma's Your data). Card headings there are the sans (`.family-backup .card__title`);
  `.family-surface` buttons and fields follow Lamplight (pill main action with the lamp, tonal quiet buttons, filled fields).
  Backups in the person's own storage (`app/family/cloudBackups.ts`): while the account syncs through Drive, Dropbox or
  OneDrive (`ownBackupStorage` in `syncController`, `ownFolder` in `ownStorage.ts`), each day's copy (once per device a day,
  after a sync, `watchOwnStorageCopies` from `startDailyCopies`; follows the daily-copy switch; last day in device-only
  `proairetosOwnStorageCopy`) and every "Save a backup file" go into the same folder as `backup-YYYY-MM-DD.sealed` (gzip
  file sealed with `sealWithAccount`, AD `proairetos-backup`; 14 days kept; the sync's `log-`/`file-` names untouched).
  Restore lists them by day (`ownStorageBackups`, `openOwnStorageBackup`); tests `src/tests/family/cloudBackups.test.ts`.
  The family list's Store row is a plus on the lamp's tile (`.family-apps__store`). Praxis's lamp seed is brass `#B08D57`.
- Lamplight 1.6, the signature (`src/lamplight/brand.css`, after `material.css`; spec "The signature" in LAMPLIGHT.md): one
  lamp, one direction, one lit thing. Surfaces lit from the upper right (`--ll-surface-light` = `--ll-sheen-edge`,
  `--ll-sheen-wash`, `--ll-cast` down-left; the sheen in each app's lamp color); keyboard focus is a warm halo (`--ll-focus`;
  More contrast keeps the ring); Today's next timeline entry carries `--ll-halo` (`.ll-next` in `DayTimeline`); a tap that
  marks a check, tick or checkbox sets `data-ll-settle` (`settleLight` in `behaviors.ts`), a glow fading over 1.1 s.
- Lamplight 2.0 preview (guide only, `#next`; spec "2.0, in preview" in LAMPLIGHT.md): `src/lamplight/daylight.ts`
  (`dayPosition` over the person's waking day, `dayLight`, `warmedLamp`, `poolColor`, vellum with `vellumReads`, tested in
  every room, mode and hour) and `src/lamplight-guide/Preview.tsx` / `preview.css` (scoped `.p2`): day light, three levels
  of light (rest, near, lit), vellum, motion as light, the person's words lit. A "Card texture" chip row (Current vellum, Stronger grain,
  Pressed paper, Linen; `data-texture` on `.p2-phone`) compares card textures on the guide only.
- Day light (2.0's first step; Settings > Appearance "Light follows your day", `Appearance.dayLight`, on
  unless turned off, one switch for the family): `app/dayLight.ts` (`startDayLight`, from `applyAppearance`) works out the position in the waking day from
  `mainSleeps` (Diaita's core, imported only when it runs; Diaita's settings when added, else bedtime and length from quiet
  hours) around the schedule and other calendars (`positionFromSleeps`, else `dayPosition` over quiet hours), on start,
  every 5 min, on coming into view and on schedule changes; `app/dayLightState.ts` keeps it. `applyLamplight` (Proairetos
  only) warms the lamp (`warmedLamp`), moves and dims the wallpaper's lamp (`wallpaperSvg`'s `lamp`: place, strength,
  glow, no white heart late) and sets `--room-shade` (a top layer in `02-shell.css`; removed under More contrast) and
  `data-ll-day`. Every other app too: its theme's lamp is warmed, and `familyDayVars` moves, warms and dims its pool of
  light at the top of the page (`--ll-day-x|y|pool|tint|shade` read by `identity.css`, defaults are the fixed lamp); its
  pictures stay as drawn. The shade (`shadeGradient`) comes back to nothing before its box ends. `applyAppearance` loads
  the worker 1.2 s after start in every app (no first chunk carries it); the last position is kept on the device for 15
  minutes (`proairetosDayLight`, not synced or backed up) so an app paints with the right light at once.
- One lit thing (Lamplight 2.0, `src/lamplight/levels.css`, `oneLitThing` in `behaviors.ts`): the one thing that matters
  now on a page carries `data-ll-lit` (a wash from the lamp's corner and a halo, stronger in light mode; text unchanged):
  Today's next timeline entry, Therapeia's doses, Ergon's and Phyton's lists for today (`.ll-lit-wrap` lights a shared
  list component's first child), Ktema's upkeep now, Diaita's Next, Dynamis's session while still to do, Askesis's
  focus card (the card, never the button inside it: a lit element needs its own corners and padding), Poreia's Next up. Only the first shown on a page keeps it (`data-ll-lit-extra` on the rest); while typing, the
  field's surface takes it (`data-ll-lit-now`, `:root.ll-typing`; Today's quiet capture line glows along its line).
  `[data-ll-lit-now]` is written `:root:root` so it outranks brand.css's surface list (its `.family-surface .rows` lifts
  that list's specificity; Today's intention never lit). The lit ring is soft (lamp at 0.24 dark, 0.42 light) and the
  family surfaces' edge is ink at 6.5%.
  The glow fades (`--ll-glow-time` 900 ms): the lit rule transitions and runs `ll-lit-in` (so it also comes up on a
  page's first paint); losing the light sets `data-ll-dimming` for the fade (`dim` in `behaviors.ts`, from `sort` and
  `clear`) and runs `ll-lit-out`. Resting and lit surfaces share one six-place shadow list (`--ll-surface-edge`, sheen
  edge, wash, then three outer places empty at rest, `--ll-no-shadow`), or the browser snaps instead of fading; the
  family edge is `--ll-surface-edge` on the element, not a separate rule. An element React replaces (Today's
  intention leaving editing) has nothing to fade.
  The light spills (`.ll-spill` in `.ll-spill-layer`, made by `oneLitThing`): one radial pool placed in page coordinates
  over the field being typed in, else the page's lit thing, reaching 64-150 px past it and set a little down-left
  (away from the lamp); `screen` in dark, `multiply` of a pale lamp color in light; it glides (translate, size) and
  fades with the light, so even a replaced element's light fades. The layer is `inset: 0` of `html` (made
  `position: relative`) with `overflow: clip`, never adding scroll room; it hides while a pull holds the page and under
  More contrast, forced colors and print. The lit card has no outline ring: a lit edge on the lamp's side
  (`--ll-lit-edge`) and a soft halo. Glow time 650 ms. Kept subtle (the owner's choice after seeing it on a navy room):
  the wash stays in the lamp's corner (0.12 dark, 0.15 light), the halo hugs the card, the pool peaks at 0.13 in dark;
  A field inside a wrapper holding only icons or buttons (Soma's `.soma-search`) lights the wrapper instead (`fieldBox` in
  `behaviors.ts`); such wrappers draw no focus ring of their own, or the box doubles.
  the field being typed in is a step quieter (`[data-ll-lit-now]` sets its own wash and halo, the pool at 0.6 opacity,
  `.is-typing`) than the page's lit thing.
  The family apps' surfaces (not Proairetos, `data-ll-pattern='none'`) have a fine 1 px edge all round (`brand.css`).
  Light as the hierarchy (after the owner's light-first review): `data-ll-lit="fallback"` takes the light only when
  nothing else on the page has it (Today's first open to-do, `.path__step`, its light reaching `--space-3` past the row);
  `:root.ll-has-lit` while something is lit, and `data-ll-recede` (Today's From your apps) then steps back to the
  scheme's second ink with no lamp wash; while typing (`ll-typing`) every surface but the one typed in steps back the
  same way (token overrides `--color-text`, `--text`, `--ll-ink` in `levels.css`, so contrast stays the scheme's).
  Resting surfaces cast no shadow (`--ll-surface-light` is the sheen edge and wash only); only the lit thing keeps
  `--ll-cast`. Rejected on purpose: cool hues for the background (temperature already means the time of day, and the
  room is the person's choice) and fixed gray text values (they fail 4.5:1).
- Vellum and shade (Lamplight 2.0, `src/lamplight/paper.css`, after `levels.css`): plain surfaces (`.card`, grouped lists,
  `.look-ahead`, `.intention`, Hydros's amount and drinks) take `--ll-vellum` as their background image (a faint fiber and
  the lamp at the upper-right corner at 7% times `--ll-day-pool`; gradient cards on other classes keep theirs; More
  contrast and print drop it); finished things go into the shade with no line through them (Proairetos's check rows and
  lists, Soma's groceries, Poreia's packing, Ergon's steps, Praxis's tasks, paid bill chips), their color easing slowly.
  `ll-enter` (motion.css) also rises from `brightness(0.72)`. `LAMPLIGHT_VERSION` is 2.0.
- One separator (the owner's choice, Today's From your apps): a hairline between rows from where the words start to
  `--ll-hair-end` (16 px) short of the right edge, in `--color-border`: `.today-group` rows, `.settings-list` rows,
  Reflect's `.reflect-places`, Capture's `.kind-list`, the family `.rows`. Draw it as its own line (background or
  `::before`), never as a full line covered in the card's color (that showed once cards took the paper surface).
  Today's open-time list reuses `.place-row` with a full-width border; `.reflect-places .place-row` takes it off.
- Pull to update (every app, touch screens; `pullToUpdate` in `behaviors.ts`, `lamplight/pull.css`): the browser's
  overscroll is off (`:root.ll-pull-on`); at the top of a page a downward pull glides the page's content
  (`PULL_CONTENT`, inline `translate`, damped to 96 px) while the wallpaper, bars and Today's foot stay put; a ring of the
  lamp's light under the top bar fills with the pull (`--ll-pull-p`) and past 110 px of finger, letting go updates:
  `setPullRefresh` (set in `appearance.ts`: `syncNow` and a service-worker update check) plus the `ll-refresh` event
  (Proairetos's App refreshes other calendars and the weather), the ring breathing, at least 0.65 s, then the page
  settles on the spring. The top bar never measures the title while a pull holds the content (`structure` waits on `ll-pulling` / `ll-refreshing` / `ll-pull-settling`; the settle calls `remeasureTitle`): measured mid-pull, the title was anchored 52 px too high, under the bar. Not from fields, sheets, dialogs, full-screen moments or a scrolled inner list. Today's foot
  (`.page-landscape` with the room picture) fades in from transparent (mask and scrim) and never lays a band of page
  color over the wallpaper: that band made the wallpaper slide behind a frame mid-screen on iOS's pull. The wallpaper
  layer is drawn 2 px shorter than its fade (`02-shell.css`), or a fractional 52lvh left a faint line.
- Date and time inputs (end of `premium.css`): full column width with `min-width: 0`, and on iOS (`@supports
  (-webkit-touch-callout: none)`) no native appearance and the value from the start; `.input-row > .field` share the
  row (iOS's own width ran two fields past Diaita's sleep log card). Fields (`adopt.css`) are a filled well with a hairline edge
  (`--ll-field-edge`, firmer on hover), a soft inner shade along the top (`--ll-field-well`) and the lamp's edge and halo on focus. Plain checkboxes take the lamp's `accent-color`;
  yes/no marks in forms use the family `Switch` (`askesis/app/ui`), as Diaita's sleep signs do.
- Type: the sans is Google Sans Flex (SIL OFL, `@fontsource-variable/google-sans-flex/opsz.css` imported first in every
  `main.tsx`: weight and optical size axes, latin about 120 KB, other scripts by unicode-range; family `'Google Sans Flex
  Variable'` at the head of every sans stack, `font-optical-sizing: auto` in `premium.css`). It replaced Inter (the
  owner's choice, after Gemini). EB Garamond stays the serif for titles, quotes and the person's own words.
- Lists and disclosure (after Diaita's Sleep page review): the colored `.row__icon` tiles by position are for settings
  lists; a list of things uses `.rows--plain` (one tonal tile, Poreia's bookings) or its own badge (Diaita's
  `.diaita-night__hours` pill), never text inside `.row__icon` (its fixed size made the hours overlap the words). No
  colored accent stripes on rounded cards (a border on one side of a rounded card curves into a hook); quote bars
  keep square left corners. Every `summary` drops the browser's triangle (premium.css "Disclosure rows"): one with no
  icon of its own gets a small chevron that turns down when open. `ColumnChart` labels every other day counted back
  from the newest. A fact needing two records (bedtime variation) shows only once there are two.
- Spacing between cards: a wrapper that groups cards inside a page (Askesis's `.home-top` / `.home-main`) lays them out with `--ll-gap` itself, since the page's gap stops at the wrapper; lists of cards use `--ll-gap` too (Diaita's `.diaita-week`). Empty-state and card titles carry no full stop.
- What's new (Settings > About > What's new, view `news`): plain lines by date from `app/whatsNew.ts`; add a line when something new ships.
- `app/ErrorBoundary.tsx` wraps every app (self-styled): a calm page with Reload and
  "Save a copy first" if a screen breaks.
- `public/_headers` sets CSP and other security headers for every app;
  script-src is `'self'` (no inline scripts in any page).
- Worker bridges (`worker/safeFetch.ts`): redirects re-checked hop by hop,
  bodies read only up to the limit, 30 requests a minute per visitor.
- The build stamps `dist/sw.js` with the build time (no hand-bumped
  cache number). `.github/workflows/ci.yml` runs lint, typecheck, tests,
  build and a wrangler dry run on every pull request.
- Component tests use `// @vitest-environment jsdom` in `src/tests/**/*.test.tsx`.
- Startup weight: no app's first chunk may pull in other apps' code. `notifications.refresh()` and
  `updateReminders` import `app/notify/upcoming` (which reads every app) only when they run. Proairetos's
  pages away from the main tabs (Onboarding, Schedule, Review, Settings, Journal, Insights, Meditate) come
  from `app/laterPages.tsx` (`use()` on a tracked import, fetched in the background 2.5 s after start, so
  view transitions never show an empty page); other screens ask Settings for a page through
  `features/settings/settingsViews.ts` (`openSettingsAt`), never by importing `SettingsPage`. The word
  guard bans "lazy", so React's `lazy` is not used.

## Architecture map

- `src/core/`: pure domain logic, no I/O. Commands return
  `{ item, events }`; history is event-based (`item-events`). Scheduling
  (`scheduling/`): any schedule is a repeating cycle of runs; overnight
  blocks; one-day exceptions; DST-safe local-date math in `dates.ts`.
  Also routines (`life-items/repeat.ts`), focus sessions, rhythm (time
  away, check-back, pause offers), observations, decisions.
  The person's day (`rhythm/personalDay.ts`, `usePersonalDay`): a day
  turns over at a chosen hour, but a work block running past it carries
  the day until 3 h after it ends (night shifts). Today, Plan, path,
  intention and Done today use it; Reflect periods stay calendar-based.
- `src/data/`: repositories (IndexedDB + in-memory, same interfaces),
  `storage/indexeddb/database.ts` (DB_VERSION 8; add stores with an
  upgrade test), backup format/crypto, `sync/` (keys, engine, Supabase
  adapter, local stores).
- `src/services/`: application services; they serialize writes (life
  service queue), notify listeners, and expose `refresh()` for sync.
- `src/app/`: shell, routes, overlays (sheets, focus, pause, undo toast),
  `back/` (one back stack for Android back, browser back, edge swipe),
  `sync/` (controller, reminder times).
- `src/features/`: screens. Four tabs: Today, Reflect, Days ahead,
  Capture (then Apps). Meditate (switchable in What's included) and Compass open from cards on Reflect; the
  tab-bar mark stays on Reflect for both, and Compass's hero has a back to Reflect (`PageHero` `back`). Days ahead uses routes `plan` (list) and `calendar`. Kinds are one
  set everywhere (`core/life-items/kinds.ts`: To do, Remember, Concern,
  Idea, Feeling), read from the stored type + capture tag. Settings >
  What's included switches parts of Today and the app on or off
  (`useTodayParts`; `startLight()` gives new people a lighter Today).
  Compass is tabbed (Values, Goals, People, Words). The item sheet shows
  essentials and puts the rest under More. Today = `features/now/NowPage.tsx` (greeting, daily Stoic
  line, intention, Today's to-do = as many picks as the person chooses, with "Focus on <first open pick>"
  under it (`.path-focus` in `TodayThree`, hidden while a focus runs; Today's header has no Focus or Pause chips:
  Pause comes from `PauseOfferCard`, the Lighter view and the palette), timeline, folded
  lists, done today, landscape at the foot). Each day in Days ahead lists its
  untimed to-dos by the person's own marks (Important, Maintenance,
  Meaningful; `features/plan/planView.ts`, `days/DayPlan`). Capture has the five kinds
  above the free box; each kind opens its own page (`CaptureKindPage`: add
  box for that kind, its open captures, closed recently), and captures with
  no kind wait on a Not sorted yet page (with Sort through). A Grateful tile
  (`GratitudePage`, What's included part `gratitude`) keeps "I'm grateful for…"
  lines as reflections (promptKey `gratitude`), never as items. Close the day
  asks for Three good things (part `three-good-things`, promptKey of the same
  name; it replaced "What made today worth it"); both show in Reflect with a
  star. The Journal stays in Reflect only. Tiles show the
  newest titles, never counts. Reflect is a
  timeline; Journal (`features/journal/`) is the full-page writer with
  optional inner weather (the person picks it; the app never infers
  mood). Insights (`features/insights/`, `core/reflections/insights.ts`)
  only counts what was recorded: no trends, conclusions, or advice.
  Settings is labelled groups of rows (`SettingsGroup`: Your days (schedule, calendars, day starts, weather),
  The app (Notifications, What's included, Appearance), Account and data (Account and sync, Privacy and lock, Your data:
  backup, daily copies, restore, bring things in and delete on one page), Apps (Store and the added apps, names only),
  About; support row last) with detail pages, under a profile card. Older page names fold into these (`shownView` in
  `settingsViews.ts`: lock→privacy, delete/import→backup, offers→today, calendar→calendars), so links keep working.
  One look for settings in every app (end of `premium.css`): a coloured tile per row (`settings-tile--<tone>`),
  hairlines that start after the tile, switches at the row's end with iOS proportions and a filled track
  (`.settings-card .toggle-row`), and pages of short lists under labels (`.settings-sections`, `.settings-card--rows`);
  What's included and Notifications use them. Calendars holds both other
  calendars and the subscription; What's included holds Quiet offers;
  About holds sources; Values live only in Compass. The name
  (`proairetos.displayName`) syncs as a setting and greets in every app (`app/family/greeting.tsx` `Greeting`);
  Ergon's own name falls back to it (`myName`).
- Practices are woven in, never a feature: `core/practices/practices.ts`
  (short steps + credited source), shown by `features/pause/PracticeScreen`.
  Pause ends with "Another way to pause"; a Feeling capture may get a
  quiet "Sit with it" offer (`components/ui/QuietOffer`, rules in
  preferences `takeOffer`: at most one offer a day, "not for me" hides a
  kind, a Settings switch turns all off); a Concern's sheet starts with
  "What part of this is up to you?"; "Close the day" appears on Today
  from `closingFrom()` (last hours of the person's day, or after the
  day's last work block). Plain words in the UI, no labels or counts.
  Also woven in: the daily thought turns over to "Try it today" (`tryIt`
  in `dailyLine.ts`); "From a while ago" folds old open concerns into
  Today's chips (`rhythm/aWhileAgo.ts`: 21+ days, keep rests 30 days);
  value cards reveal "In practice" (`values/descriptions.ts`); the Lighter view shows a `GentleLine` (`stoic/gentleLines.ts`).
- Today is shaped by the person: `useTodayParts` (Settings > What's
  included; "Not for me" sets a part aside with undo,
  offered once a part was shown on 3 days: `partSeen`) and a Lighter view
  (`LighterView`, the leaf; for the day it is chosen, easing back the next
  day). Things not sorted lead to Sort through, which also sets the kind.
  An item's When is one field: a day, plus a time if it has one
  (time -> `scheduledAt`, day only -> `plannedFor`). Lists that come back are routines with a
  `checklist` that clears each time (`setChecklist`); they stay off the
  timeline and send no reminders. Reminders respect quiet hours and
  protected time (`rhythm/quietHours.ts`; held, never dropped).
- One backup for the family: the Proairetos backup file (`data/backup/format.ts`)
  also carries Askesis (workouts, plan), Soma (recipes, groceries) and every
  app's settings from localStorage (`data/backup/family.ts`: prefixes
  `proairetos.`, `askesis:`, `soma:`; never the sign-in session, caches,
  drafts, other calendars' events, the calendar feed link, or Askesis songs).
  All optional in the format, so older backups still restore. Askesis and
  Soma's Your data use the same card (`app/family/FamilyBackup.tsx`; their
  older files still restore through `older`); any app's backup counts as the
  one last backup (`proairetos.lastBackup`).
  Daily copies: once a day when any app opens (`app/family/dailyCopy.ts`,
  `startDailyCopies` in each `main.tsx`), the same file is kept in IndexedDB
  `proairetos-daily` (`data/backup/daily.ts`, last 7 days, none when there is
  nothing to keep); switch `proairetos.dailyCopy` (on unless "false"); listed
  and restorable on every app's backup page (`useDailyCopies`).
- Between the apps: one account. Where they share storage, signing in to
  one signs in all; where they do not (each iPhone Home Screen app keeps
  its own), Askesis and Soma sign in and unlock in `app/family/AccountCard`
  (first-time setup stays in Proairetos, `?open=account`). Open apps tell
  each other about changes and sign-in over BroadcastChannel
  `proairetos-family` (`tellFamily` in `syncController`). Links carry
  `?open=` (`app/family/opening.ts`): Askesis `workout:ID`, `entry:ID`, a
  tab; Soma `recipe:ID`, `week`, `tonight`; Proairetos `day:today`,
  `reflect`, `compass`, `account`.
- Sign in other apps (iPhone Home Screen apps keep their own storage; migration `20261019000000_sign_in_handoff.sql`,
  function `sign-in-handoff`): Proairetos's Account page has "Sign in other apps" (`app/family/SignInPass.tsx`): the
  passphrase once (`enableHandoff` keeps an exportable copy of the data key in syncMeta `handoffKey`, device only,
  cleared on sign-out, "Turn off"), then "Copy a sign-in pass" (`makeSignInPass`: a magic-link `token_hash` from the
  function, no email sent; the data key sealed with a random wrap key, AD `proairetos-handoff:ID`, `data/sync/handoff.ts`;
  the wrap key left in `sign_in_handoffs` for 2 minutes). Every family AccountCard has "Paste from Proairetos"
  (`signInWithPass`: verifyOtp, `take_handoff` returns the wrap key once to the same user and deletes it, the key kept
  is not exportable; the clipboard is cleared; falls back to pasting by hand).
- Passphrase: unlock offers "Forgot your passphrase?" (Proairetos `AccountSection` and every family `AccountCard`): the recovery
  key plus a new passphrase twice; `changePassphrase(secret, 'recovery', next)` opens the data key exportable for that moment,
  `rewrapWithPassphrase` wraps it under the new passphrase (fresh salt) and `savePassphraseWrap` replaces only `passphrase_wrap`
  in `user_keys` (RLS "own key" allows it), then it unlocks. Signed in, Account has "Change passphrase" (current one, new twice).
  Nothing encrypted changes, the recovery key keeps working, open devices stay open. Lost both: synced data cannot be opened.
- Sign-in, made short (`features/settings/AccountSection.tsx`, `app/family/AccountCard.tsx`): signed out shows "Sign in with a
  passkey" (gold), an email field and "Continue with email"; Google/Apple and "Paste from Proairetos" fold under "Other ways to
  sign in". A new account sets up with a passkey (migration `20261023000000_passkey_first.sql` makes `user_keys.passphrase_wrap`
  nullable): keys made before the tap (`prepareKeysForPasskey`, `createKeysForPasskey`), "Create a passkey" (`makeSetupPasskey`),
  on iPhone one Continue (`continueSetupPasskey`), then the recovery key with Copy and "I've saved it" (`finishSetupWithPasskey`
  saves keys and passkey only then). "Use a passphrase instead" keeps the old way; a server without the migration
  (`PassphraseRequired`) or a passkey that gives no secret falls back to it. Unlocking with a passphrase makes the passkey offer
  follow by itself (no checkbox); an account with no passphrase opens with the recovery key (`hasPassphrase`), and Account's
  "Add a passphrase" uses it. Signed in: email and last sync with Sync now, Passkeys, Sign in other apps, then More (where it
  syncs, system check, passphrase, delete account) and Sign out.
- Passkeys (migration `20261020000000_passkeys.sql`, function `passkey-sign-in` deployed `--no-verify-jwt`, verifier in
  `supabase/functions/_shared/webauthn.ts` `checkAssertion`, copied into the function so it deploys as one file (a test keeps them equal), ES256/RS256, tested from `src/tests/sync/passkeys.test.ts`):
  a passkey (rp = the site, so every app) signs in and opens the data. `data/sync/passkeys.ts` (`createPasskey`,
  `askForPasskey`, PRF with a fixed salt); the PRF secret wraps the data key (`wrapWithPasskey`, HKDF info
  `proairetos-passkey`), kept in `passkeys.wrap` with the public key. Signing in: `passkeyChallenge` (fetched before the
  tap), `signInWithPasskey` (function checks the signature, returns a magic-link `token_hash` and the wrap). Locked:
  `openDataWithPasskey`. Safari allows WebAuthn only straight after a tap, so nothing slow runs before
  `credentials.create/get`: the passphrase is turned into an exportable key first (`preparePasskey`, or `unlock(...,
  forPasskey)` from "Add a passkey for next time"; memory only, `passkeyKey`), then `MakePasskeyNow` is the tap.
  Without PRF a passkey only signs in ("signs in only"); when such a passkey signs in and does give its secret, the next
  passphrase unlock seals the data key for it (`passkeyToFinish`, `savePasskeyWrap`), so it opens the data from then on. Settings > Account > Passkeys has "Let it open your data" on a sign-in-only passkey
  (passphrase, then one tap, `letPasskeyOpen`); it says plainly when the device gives no secret.
  iPhones give the PRF secret only when a passkey is used, not when made, and refuse a second ask without a tap: `createPasskey`
  returns `secretOnUse`, `addPasskey` returns `finish`, and `MakePasskeyNow` / Passkeys offer the one more tap (Continue).
  `onPasskeysChanged` lets screens re-read the list.
  With a passkey that opens the data (`useOpeningPasskeys`), unlock leads with "Open with a passkey" and the passphrase
  is behind "Use my passphrase"; "Sign in other apps" hides, and "Paste from Proairetos" moves into the sign-in step. UI: `app/family/Passkey.tsx` (every AccountCard and
  Proairetos), list/add/remove with undo in `features/settings/Passkeys.tsx`.
- Modern web round: Declarative Web Push (`send-reminders` adds `web_push: 8030`, the app's name, icon, and either
  the chosen reminder preview or "You have a reminder."; `navigate` comes from `SITE_URL`, `mutable: true`, beside
  the sealed `n`; the SW still shows the person's words when it wakes).
  `keepStorage()` in `dailyCopy.ts` asks `navigator.storage.persist()` from installed apps only. Read from a photo
  (`app/family/ReadFromPhoto.tsx`, `ocr.ts`: Tesseract on the device, files from `/ocr/` copied by the `ocr-files` plugin in
  `vite.config.ts` from node_modules, nothing in the repo; CSP has `'wasm-unsafe-eval'`; picks in `core/ocr/labels.ts`
  `medicineFromText`, `thingFromText`, `billFromText`, tested) on Therapeia's Add a medicine, Ktema's thing form and
  Oikonomia's bill form. File Handling (`file_handlers` in four manifests, `app/family/launchFiles.ts`
  `startLaunchFiles` in their `main.tsx`, `useLaunchedFile` on BringInSection .ics, Spent .csv, Askesis Log .gpx/.tcx,
  Theoria Add a book). Android extras (`app/family/deviceExtras.ts`, `DeviceExtras.tsx`, shown only where supported):
  `ScanBarcode` in Soma groceries (BarcodeDetector on a photo, name from Open Food Facts), `FromContacts` in Philia's
  person form, `WriteTag` (Web NFC, a URL record) on plant, chore and upkeep pages.
- Modern web round 2: cross-document view transitions (`@view-transition` in `premium.css`, reduced motion off);
  `app/family/voice.ts` (`useListening`, `says`) used by Soma Cook ("next/back/again/timer") and Dynamis's session
  ("done" ticks the next set, "skip" ends the rest; switch kept in `dynamisListen`, device only); backups saved gzip
  (`data/backup/packing.ts`: `downloadBackup`, `backupText` reads either, `BACKUP_ACCEPT`); `syncNow` runs under the
  Web Lock `proairetos-sync` (one tab at a time); Praxis `FloatTimer.tsx` (Document Picture-in-Picture, portal into the
  window); prefetch rules served by the Worker at `/api/speculation-rules` (`worker/speculation.ts`, header in
  `_headers`, prefetch only, never prerender: the apps start sync and writes on load); Soma `app/translate.ts` +
  `TranslateRecipe.tsx` (Chrome's Translator and LanguageDetector, shown before Keep it, undo).
- Any-device round: passkey autofill (`usePasskeyAutofill` on the email fields, `autoComplete="email webauthn"`,
  `passkeyAutofill`/`stopPasskeyAutofill` in `syncController`, conditional `askForPasskey`, quiet without the server);
  `tap()` (`app/feel.ts`) uses `vibrate` or, on iPhone, flips a hidden `<input type=checkbox switch>` (Safari's own
  haptic); `applyAppearance` adds one click listener so every `[role=switch]`, `.toggle-row`, `.switch-row` taps;
  `useWakeLock` (`app/family/wakeLock.ts`) in Praxis (running, not paused) and Dynamis's session (not Diaita's nap:
  light works against a nap); Praxis Media Session (title, play/pause) while a sound plays; `StorageFacts`
  (`navigator.storage.estimate`, persisted, "Ask to keep it" = `keepStorage(true)`) on every backup page;
  `prefers-reduced-transparency` / `prefers-contrast: more` at the end of `premium.css`; Web Share Target with files
  (manifests of Ktema, Therapeia, Theoria; `takeShare` in their workers keeps files in Cache Storage
  `proairetos-share-inbox`, `startLaunchFiles` hands them to `useLaunchedFile`; Ktema `SharedPage` route `shared`,
  Therapeia reads a label photo at once via `ReadFromPhoto initialFile`); Phyton Periodic Background Sync
  (`phyton/app/background.ts` leaves place, names, unit and known frost nights in Cache Storage
  `proairetos-phyton-outside`; `public/phyton/sw.js` `checkFrost` asks Open-Meteo, 12:00-22:00, once a night).
- Readable copy: Settings > Back up and restore > "A readable copy" downloads Markdown of the person's own words (reflections newest first with the prompt they answered, decisions, Compass, captures; `core/export/markdown.ts`, `backupService.exportReadable`). Not a backup, no password, other apps' records and photos left out.
- Capture from anywhere (Settings > The app > Capture from anywhere, view `inbox`; migration
  `20261024000000_capture_inbox.sql`; Worker `/api/capture`, `worker/capture.ts`, vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`):
  the device makes an RSA-OAEP key pair and a token (`app/capture/inbox.ts`, kept in `proairetos.captureInbox`, device only,
  out of backups and sync); the server gets the token's SHA-256 and the public key (`capture_inboxes`). An iPhone Shortcut
  (Ask for Input → Get Contents of URL, POST JSON `{token, text}`; Siri, Back Tap, Apple Watch) reaches the Worker, which
  seals the words (`sealForInbox`: fresh AES-GCM key wrapped by RSA-OAEP, AD `proairetos-capture`) and keeps them through the
  security-definer RPCs `inbox_key` / `inbox_add` (anon key only, at most 200 waiting). `InboxOpener` in App opens them on
  start, on sync ready and on coming into view, adds captures (first line title, rest note), deletes what it read, one undo.
  Items sealed for another device's key are left for it. `?capture=TEXT` also opens the Capture sheet with the words.
- Apple Health (Settings > The app > Apple Health, view `health`, `HealthSection.tsx`; migration
  `20261028000000_health_inbox.sql`; Worker `/api/health/<token>`, `worker/health.ts`): Health Auto Export's REST API
  automation posts its JSON; `core/health/autoExport.ts` `readHealthExport` keeps only runs/walks/hikes/rides, nights
  (aggregated `sleepStart`/`sleepEnd`, or stages joined when under 2 h apart; the day woken into), water (a day's total at
  noon, one id per bucket so a grown total replaces it) and readings (weight, blood pressure, blood sugar and oxygen at most
  one an hour, resting heart rate one a day, body temperature), wall times kept as written. The Worker seals parts of 400
  records (`sealForInbox`, AD `proairetos-health`) through RPCs `health_inbox_key` / `health_inbox_add` (500 waiting). The
  token and private key are sealed with the account key in `health_inboxes.sealed_key`, so every app and device opens what
  arrives (`app/health/health.ts`, device copy `proairetosHealthKey`, device only); choices in the synced
  `proairetos.health` (present = on). `startHealthInbox` (Proairetos, Askesis, Hydros, `startApp`) loads the work only while
  on, on start, sync ready and coming into view (once a minute), and `applyHealth` writes to the added apps only:
  Askesis entries `health-<id>` (`newWorkouts` skips one already logged by hand, file or Strava; runs count as the open
  session), Diaita nights with `from: 'health'` (a night written by hand is never replaced), Hydros water and Therapeia
  readings with `health-` ids; one undo for all (`broughtInText`). "Bring in a file" reads a saved JSON export, signed in or not.
  Android: the same address takes Health Connect Webhook's JSON (HC Webhook, Google Play; `isHealthConnectPayload`: snake_case
  arrays at the top, no `data`; `readHealthConnect`): exercise by Health Connect's type numbers (56/57 run, 79 walk, 37 hike,
  8/9 bike) or words, sleep stages joined into nights with awake stages (1, 3, 7) left out, hydration in liters, weight kg,
  blood glucose mmol/L, oxygen, body temperature °C, resting heart rate, blood pressure; UTC times are placed on the
  phone's own day by the payload's `timezone` (`inZone`). The page (now "Health data", view `health`) has iPhone/Android steps.
- Lock (Settings > Your data > Lock Reflect, `app/lock/`): an optional 4-8 digit passcode (PBKDF2 hash in `proairetos.lock`, device only, left out of backups and sync). Reflect, Journal, Insights and the weekly review show `LockScreen` while locked (Today one tap away; "Forgot it?" removes the lock, writing untouched) and search leaves reflections out. Locks again after a minute out of sight. Privacy on a shared phone, not encryption.
- Settings has a "Find a setting" box (rows are data in `SettingsPage`, each with title and a few search words) and, from 62rem, keeps the list on the left with the opened page on the right (`settings-split`). The manifest has Capture and Journal shortcuts for the installed icon.
- Ease of use, checked against Apple's, Google's and Microsoft's guidance: onboarding is five steps (the two pitch screens
  are one, `steps.ts`), each step scrolls inside the page with its action held at the foot over a dark fade
  (`01-onboarding.css`). The capture box reads a day or time from the words like the palette (`CaptureBar`:
  `parseQuickAdd(text, today, now)`, shown under the box with "Keep the words as written"; feelings, ideas and concerns
  keep their words) and, on Today, says it was added with Undo. Today's own weekday means today unless "next" is said
  or the time has gone by. Tapping an item in Your day opens its sheet in place (schedule blocks and events still lead
  to Days ahead). Days ahead's rows pull left to delete with undo, as in Reminders (`SwipeItem tone="remove"`, its
  `frontRef` keeps the card-to-page morph), and the delete is also in the long-press menu and shows on pointing with a
  mouse (`.days-row` in `ROWS`, `28-days.css`). A capture read as a time is filed as a To do.
- Wording, checked against Things, Todoist and Reminders: undo toasts name the thing first (`“Stretch” deleted`,
  `“X” done`, `“X” added, Fri 3 PM`); errors say what happened in a contraction and what to do ("Couldn’t save that.
  Try again."), never "could not … just now"; a form's button is Save (Keep stays for "keep or discard" choices).
- Command palette (Ctrl or ⌘ + K, `app/palette/CommandPalette.tsx`, works while typing): go to any page, pause, focus, search, or write a thing down. Typed words become a "Write it down" row, read by `core/capture/quickAdd.ts` ("dentist friday 3pm 45 min": day, time, length; shown before Enter saves, with undo). Sheets focus their field in an effect, not `autoFocus` (the dialog opens after render).
- The family on Today and in search (read only, `app/family/read.ts`, `glance.ts`, `features/today/TodayFamily`): Settings > What's included is organised by app (Proairetos: Today, Capture, Compass, Reflect; Askesis; Soma; Oikonomia). Oikonomia's `bills` (bills coming up on Today, on since the working-parent walkthrough; shows only when a bill is due within days) and `bill-dates` (in Days ahead, on). Water stays in Hydros (the owner's choice): Proairetos Today shows none; `waterDuring` in `glance.ts` is kept but unused. Theoria offers `highlight` (opt-in): one of the person's highlights a day (`highlightOfDay` in `theoria/core/export.ts`, `TodayHighlight`), opening the book (`/theoria/?open=book:ID`). Search also finds Soma recipes, Theoria books (author, highlights, notes) and Oikonomia bills (`kind: 'app'`, opens that app).
- From your apps (Today, `features/today/FromYourApps.tsx`, rows from `app/family/fromApps.ts` `fromAppsRows`, tests in
  `src/tests/family/`): one list of what came round in the other apps (unmarked doses and visits today from Therapeia,
  chores from Ergon, plants to check from Phyton, upkeep from Ktema, a training day from Dynamis as a link). Ticking marks
  it in that app's own store (`markIn`: `water`, Ergon `markDone`, `take`, Ktema `markDone`) with Proairetos's undo.
  Nothing is stored in Proairetos; each row still follows its What's included part (`plants`, `chores`, `medicines`,
  `upkeep`, `training`). Diaita's sleep and Philia's birthdays stay as their own lines (they are not things to mark).
- Looking back (`core/reflections/lookBack.ts`): Today part `on-this-day` (opt-in, off until chosen) shows what was written on this date in earlier years, the person's own words, hidden while the lock is on; Insights ends with a folded "A year in your own words" (grateful lines, three good things, journal, decisions, goals reached, values chosen, oldest first, plain lines only).
- Design pass: from 62rem Today lays its cards in two columns (greeting, capture and done-today across; `30-desktop.css`); page titles share one size (2.3rem); on phones the bottom bar has larger labels and a short accent line over the current page (`premium.css`).
- Add to your calendar (item sheet > More, when it has a day or time): one `.ics` event with place and note (`buildIcs` takes `location` and `notes`). On a computer an open to-do (not a list that comes back) can be dragged onto another day in Days ahead's list; it moves with an undo (`CheckRow` `DRAG_TYPE`, `moveItemToDay`).
- Written about (Compass > People, open a person): items and reflections that mention their name as a whole word, newest first, up to five (`core/compass/mentions.ts`); reflections left out while the lock is on.
- Web app plus iOS and Android apps from the same code (the owner's choice, Oct 22): the website stays the main
  build and must never change for the native one; native-only code sits behind `isNativeApp()` (`app/native/`) and
  is imported only when it runs.
- Phone apps (Capacitor, `capacitor.config.json`, `docs/NATIVE.md`; native folders are made on the person's computer):
  every `/api` call goes through `apiUrl` / `VITE_API_BASE`; the Worker treats the app's origins (`NATIVE_ORIGINS`)
  as the site on every `/api` route (`asFromSite`, CORS; test `src/tests/worker/nativeOrigins.test.ts`). In the app,
  `notifications` schedules the soonest 60 notices on the phone (`app/native/localReminders.ts`,
  `@capacitor/local-notifications`, `nativeId`, taps by `placeFor` in `core/notify/place.ts`, kept equal to `sw.js` by a
  test). Not done: server push to the phone, universal/app links for sign-in returns, widgets.
- Oikonomia bills: pull a bill row to the left (or press the left arrow on it) to mark it paid (`oikonomia/app/SwipeRow`, `payBill`, 7 seconds to undo; one undo bar for the app, `oikonomia/app/undo.tsx`, above the pages). The bill page records what was actually paid (totals use it; `usualAmount` shows "Usually about" when it varies), offers Add to your calendar (.ics), "No more dates" (`endedOn`, history kept) and Remove (both with undo). Autopay dates count as paid once they come (`paidForOccurrence(bill, date, today)`, shown in history as automatic). A date that came without a payment reads "Was due Oct 1" and stays the bill's date until the next is within its return window, then quietly passes (`hasPassed`, not counted as left to pay); never "past due". Reminders go out through Proairetos notices (`core/reminders.ts` `billReminders`, kind `bill`, 9:00 on the lead day, switch "Bills, from Oikonomia", tap opens `/oikonomia/?open=bill:ID`). More has currency (moves bills and plans, with undo), week start (the calendar follows it), the family AccountCard and FamilyBackup with daily copies. Bill areas are the monthly plan's areas. The monthly plan saves as it changes. A paid bill leaves the Bills list, folded under "Paid, back when due", and comes back when its next date is within its reminder lead (at least 7 days) (`standing`, `returnWindow` in `core/bills.ts`). Home's This month, and Calendar's Due this month / Due this week, show the amount left to pay first, with the whole beside it (`remainingSummary`).
- Oikonomia Pay (More > Pay, route `pay`, `?open=pay`; `core/pay.ts`, `data/pay.ts`, `screens/PayPage.tsx`, `PayCard.tsx`):
  incomes (`oikonomia:pay`, synced setting: name, optional usual amount, every week / two weeks / twice a month (a day and
  `secondDay`, 31 = last day) / monthly, from one known date, `payDates`). Home's card: the next pay date and days to it,
  the unpaid bills before it (`billsBefore`, matched by due date like payments), "What's in the account now?" (kept as
  `oikonomia:balance` with its date; "Left after them" shows only for an amount said today), and the span to the pay
  after (bills, and pay about, when amounts are given). Facts only, never advice.
- Oikonomia Spent (route `spent`, from More and the monthly plan; `core/statements.ts`, `data/spent.ts`, `screens/SpentPage.tsx`): "Bring in a statement" reads a bank or card CSV (`readStatement`: finds the table under account lines; one amount column with money out by the commoner sign, or Debit/Credit columns; ISO, month-first or day-first dates decided from the column; amounts like `(12.00)` or `12,50`). Only money out is kept; money in, balances and account numbers are left out. Each line gets a first area (`guessArea`: the person's earlier move for that shop in `oikonomia:areaChoices`, else words), shown for review before keeping; lines already kept are skipped (`newLines`). Kept per month in `oikonomia:spent:YYYY-MM` (backed up, synced as settings). The page shows the month's total and plain totals by area with the plan's amount beside it; tap a line to move or remove it (undo).
- Hydros (`src/hydros/`): drinks count toward the person's day as Proairetos keeps it (`drinkDay` uses `personalDate`; `app/day.ts` `useDays` reads the schedule through `scheduleBetween`), so a night shift keeps its water. Every drink type counts in full unless the person changes it (`HYDRATION_SOURCE`: Maughan 2016, Killer 2014; settings format 3 brings untouched old partial credits up to 1). No made-up recommendation: Settings offers published reference amounts with their source (`referenceAmounts`, National Academies 2004 / EFSA 2010) and a "Use" button; until one is chosen Today shows only what was drunk. Usual glasses (`glasses`, one tap from Today, editable in Settings) and "Same again", each with undo (`app/undo.tsx`, `app/log.ts`); Today lists the day's drinks (`app/DrinkEntry.tsx`, shared with Flow, delete with undo) and caffeine as facts (`caffeineFacts`). The run-day addition is shown on the orb and can be switched off (`runDayExtra`). Flow is Week / Month with a real line at the chosen amount (none without one) and every entry of the period. Reminders (`app/notify/hydrationSchedule.ts`): steady clock times every interval from the end of quiet hours through the waking day, or through work blocks when "During work" is chosen (quiet hours do not apply inside work), never sooner than an interval after the last drink (store changes call `notifications.refreshSoon()`); the body says only when the last drink was logged; a tap opens `/hydros/`. Settings > More > "Download the log (CSV)" (`core/export.ts` `drinksCsv`: local date and time, name, amount and what it counts as in the person's unit, caffeine, electrolytes, sugar; oldest first). Add from Today opens a custom drink form; each custom profile gets its own id and remains available for later additions, while old `other` records remain readable. Today keeps custom profiles under History, with the last amount as a one-tap log. Links and shortcuts: `?open=glass` (logs the first glass, with undo), `add`, `custom`, `add:TYPE`, `flow`, `settings`; Askesis's after-run page links "Log a drink in Hydros". Settings has the family AccountCard and FamilyBackup; daily copies start in its `main.tsx`. Proairetos opens `?open=settings:VIEW` (privacy, help, …).
- Praxis (`src/praxis/`: `PraxisApp.tsx` shell and timer, `views.tsx` pages, `data.ts` facts, `bell.ts`): study blocks are life items with `app: 'praxis'`; `lifeService.list()` and `historyForAll()` leave family-app items out of Proairetos's own lists (`listForApp`, `listAll`, `historyForAll(true)` include them; Compass goals count steps from all). Nothing is seeded; the first version's three unused starter blocks (made before 2026-10-11, no time on them) are taken out (`unusedStarters`). Blocks are added, renamed, given a usual length (`setPlannedMinutes`), linked to a Compass goal, marked done, removed (undo). The timer: free length (chips or typed), Pause, "Stop here" keeps the minutes, a bell on the audio clock at the end (`scheduleBell`, rings with the screen locked) and a notice if allowed; Sounds has None and switches live. After a block (`AfterBlock`): a 5 or 10 minute break, one line kept in Reflect (promptKey `after-study`), "Look at this again" in 1/3/7 days (`plannedFor` on the block, `LOOK_AGAIN_SOURCE`: Cepeda 2006, Roediger & Karpicke 2006). No scores: Time shows minutes by day (Monday-first week by the person's day, `app/family/personalDays.ts`) and by block; Sessions lists every session by day, change minutes or remove (`changeFocus`, `removeFocus`, undo). Theoria books being read are offered as "Read: title". Links: `?open=start|sessions|time|sounds|settings` (manifest shortcuts); `start` opens the next block ready (a larger Start, `praxis-button--ready`), since phones only allow sound from a tap. The running block's end is a family notice (`study` in `NoticeSettings`, kind `study`, `studyEnd` in `upcoming.ts` reads the focus session, not held by quiet hours, tap opens `/praxis/`), so with the server's reminders set up it arrives with Praxis closed; Praxis calls `notifications.start()` and refreshes on every start, pause and stop. Praxis registers Proairetos's `/sw.js` (scope /) for offline and push, because each iPhone Home Screen app keeps its own storage; that worker caches its static pages by path so `?open=` links open offline. Proairetos Today part `praxis` (on): study in Done today and Reflect (`StudyEntry`), and a quiet row on the day a block is set to look at again (`app/praxis/study.ts`, `TodayStudy`).
- Praxis Cards (tab `cards`, `?open=cards`, manifest shortcut; `praxis/cards.ts`, `CardsView.tsx`): question and answer cards, for a block or for all, kept in the setting `proairetos.praxisCards` (backed up, synced as a setting). Five Leitner boxes (`BOX_DAYS` 1, 2, 4, 8, 16 days): "Knew it" moves a card a box on, "Again" back to the first box for tomorrow (`answer`); a sitting offers what is ready, longest waiting first, at most 20 (`ready`); the rest simply wait, never late; when none is ready it says the next day. Several at once from lines (`cardsFromText`: `question :: answer`, a tab, or two lines). Sources shown (`CARDS_SOURCE`). A card's words can be changed in the list (`editCard`, box kept, undo); "Bring in a file (CSV)" reads CSV, semicolon or tab-separated exports (Anki, Quizlet; `cardsFromCsv`: first two columns, heading row skipped, doubles left out) and "Download the cards (CSV)" writes `cardsCsv`; with Theoria added, "From your highlights" lists highlights not yet on a card (`highlightsToOffer`, read only from `theoriaBooks`) and Use puts one in the answer for the person to write the question. The phone bar has six items.
- Theoria (`src/theoria/`): a book's text and file live on the device in IndexedDB `theoria-files` (`data/files.ts`: texts, files, covers; device only, not in backups), never in the synced record (chapters there are an outline, `contentPreview` at most 600 characters). Text and Markdown are kept whole and split into parts by headings or every 40 paragraphs (`splitText`); PDFs are read with PDF.js 4 (`data/pdf.ts`, lazy, worker from this site, no eval): text in parts of ten pages, and a Pages view drawing the pages (`components/PdfPages.tsx`), for scanned PDFs too. A copy for other devices is optional (Settings switch for new books, per book on its page), sealed with the account key first and kept in the person's own Google Drive, Dropbox or OneDrive, the folder the account syncs through (`data/cloudCopy.ts`: `ownBackupStorage`, files `book-<id>.sealed` / `cover-<id>.sealed`, paths `own:<name>`; without own storage `NO_OWN_STORAGE` says where to choose one). Book files never go to the site's server (it would fill for many people); copies the first versions kept in the theoria buckets are still read, and `moveServerCopies` (`library.ts`, from `fetchFolderBooks`) moves them into own storage or, for books from a cloud library folder, removes them (`fromCloudFolder`: the folder has the file and every device fetches it from there, so such books get no copy at all); another device brings it over with "Bring it to this phone" or by choosing the file. First-version books move once (`migrateBook`): text out of the record, unsealed files fetched, kept, sealed and the unsealed ones removed. Every removal has undo (book with its device copy, the account copy only after the undo window; highlights, notes, bookmarks, reflections, note pages). "Refresh details" fills only what is empty, with undo. Settings has AccountCard and FamilyBackup; daily copies; registers `/sw.js`; shortcuts `?open=continue|add|book:ID`. A new reflection can also keep a line in Proairetos Reflect (promptKey `after-reading`, chosen in the dialog). A book's page offers "Open Praxis" (`/praxis/?open=read:TITLE`: Praxis makes or finds the block "Read: title", 20 min, ready to start) and "Export highlights and notes" (Markdown, `bookMarkdown`).
- Theoria shelves (`core/shelves.ts`): a book's page moves it between Reading, To read, Finished and Put away (status `archived`; undo); opening the reader still moves it to Reading. The shelf page has those tabs (All leaves put-away books out), a find box (every word in title or author, accents ignored) and an order (last opened, title past articles, author by surname, added) beside the categories (`booksOnShelf`).
- Backup folder (`app/family/backupFolder.ts`, File System Access, shown only where `showDirectoryPicker` exists: Chrome and Edge, not Safari or Firefox): the family backup card's "Backup folder" keeps the folder's handle in IndexedDB `proairetos-folder` (device only). With one chosen, "Save a backup file" writes into it (asking again if the browser forgot), and each daily copy also goes to its "Daily copies" (`dailyCopyToFolder`, the last 14 kept). Theoria copies every book kept on the phone into "Theoria books" by title, same-size copies left alone (`data/toFolder.ts` `copyBooksToFolder`: on start without a prompt, after adding books, and from Settings "Copy books to the backup folder").
- Theoria library folder (Settings > Library folder, `components/LibraryFolder.tsx`): a folder in OneDrive, Google Drive or Dropbox on any device (`data/cloudLibrary.ts`: PKCE sign-in through `/storage-connected/` with state `theoria.…`, which `finish.js` sends back to `/theoria/?open=settings`; OneDrive `Files.Read` (browser trade for the single-page registration), Google `drive.readonly`, Dropbox through `DROPBOX_LIBRARY_APP_KEY` (a Full Dropbox app; without it the app-folder key shows only its app folder); the Worker's `/api/storage` takes `scope: 'library'` and GET lists `library` ids; a folder browser picks the folder, kept in the synced setting `theoria:cloudFolder`; each device's sign-in in `theoriaCloud.<provider>`, out of backups and sync), or a folder on this computer (Chrome, Edge; `data/libraryFolder.ts`, handle `theoria-library` in `proairetos-folder`). Theoria looks through it 5 s after opening and on coming back into view (at most once a minute), and from Check now (`syncLibraryFolder` in `TheoriaApp`): `planFolderScan` (`core/folder.ts`) adds new paths, replaces the file of a book whose file changed size (highlights and place kept), never brings back a book taken off the shelf; a folder file already on the shelf by name and size is linked to that book (`link`), never added again; a file at two paths is one book (`same`); each add first re-reads the shelf; the folder pass and the merge run under the Web Lock `theoria-library-folder` (one tab or window at a time); copies made anyway (another device before sync) are merged into the original on opening and after each pass that added books (`folderDuplicates`, `mergeBooks`: marks joined, the further place and later opening kept, only books the folder added are taken away, one undo, which holds for that visit only); paths are kept in the synced setting `theoria:folderBooks` (`provider:path` for cloud folders), books carry `fromFolder`. A folder book missing on this device comes straight from the folder when it is reachable here, else from its sealed copy (books from a folder on a computer get one in the person's own storage when signed in; cloud-folder books need none). On every device, once signed in (`fetchFolderBooks`, same timing): a book whose copy could not be made when added (signed out, or the server without the buckets) gets it now when copies are on or it came from a folder on a computer (never when the person removed it: `cloudCopy: false`), and every book with an account copy that is not on this device comes down by itself.
- Theoria books from your storage (Settings > Your storage, `CloudConnections`: connect OneDrive, Google Drive or Dropbox on this device, read only, without choosing a folder; `connectCloud(provider, 'books')`): opening a book that is not on this device (`loadText` → `bringBook`), or "Bring it to this device", looks first where it was found before (`foundIn`, synced on the book), else searches each connected storage for the same file name and size (`findInCloud`: Graph `search(q=…)`, Drive `name = '…'`, Dropbox `search_v2`; `pickMatch`), downloads and keeps it, and records `foundIn`; then the sealed account copy. Tested in the browser against a stand-in OneDrive.
- Theoria Settings › "Clear the library" (asks once): every book removed with one undo (account copies forgotten after it), the folder map emptied, then a fresh look through the library folder. Adding a file already on the shelf (Add a book, Several files, the folder; `sameFile`: name and size) opens or links that book instead. Cloud folder paths carry the storage's mark (`onedrive:…`); `fileNameOf` takes it off before matching (this caused top-level folder books to be added twice).
- Theoria many at once: Add a book > "Several files" or "A whole folder" (`webkitdirectory`, subfolders too; `core/folder.ts` `booksToAdd`: EPUB, PDF, text and Markdown, hidden files and books already on the shelf by name and size left out), each read like a single book, one undo for all. Account copies need migration `20261014000000_theoria_storage.sql` (the buckets); without it the message says they are not set up (`plain` in `cloudCopy.ts`).
- Theoria also: Settings > "Bring in highlights" reads a Kindle's My Clippings.txt or a Readwise CSV (`core/clippings.ts`: notes beside their highlight, bookmarks left out; matched to shelf books by title and author, else a new book with no file; a highlight already there is skipped; one undo for all). In the reader, a selected word or two can be looked up (`core/lookup.ts`, Free Dictionary API from Wiktionary, only that word is sent, the source shown) and Listen reads aloud by the phone's voice a paragraph at a time from where the reader is (`is-reading`), stopping on a chapter change.
- Bills in Days ahead (Settings > What's included > Oikonomia > Bills, part `bill-dates`, on by default): each bill date is a quiet line under its day in the list and the month's day panel, a small tag across the top of the week, and a dot on the month grid; paid ones are marked, not hidden (`billsOn` in `app/family/glance.ts`, read only, opens Oikonomia).
- Calendar look (Days ahead): week columns have full-width rounded entries with a colour edge, title and time (no colour set = gold), a gold now-line and tinted column for today, dates in circles (today filled gold), faint hour lines and hairlines between days; delete shows only when pointing. Month, from 62rem, has roomy days with colour chips and "+n more"; phones keep dots. Toolbar is one row on computers (dates, List/Calendar, Week/Month/Year); the calendar sits on a glass panel under a warm light at the top of the page.
- Calendar layout: from 62rem the week has a mini month beside it (`features/days/MiniMonth.tsx`: pick a day to bring its week in; the seven days on show are banded; Today button). Under 48rem the week shows one day at a time with a strip of the seven days on top, swipe sideways for the next day (past the end moves the week), and it opens near the current time when today is in view.
- Week drag (computers, mouse or pen): a timed item that does not repeat can be pulled to another time or day, or stretched from a grip along its foot, in 15-minute steps (`core/rhythm/dragMath.ts`, handlers in `DaysAheadPage`); Alt with the up and down arrows moves it a step, Alt and Shift changes its length; each change offers undo. Shifts from the schedule and events from other calendars are not draggable. Year: four months across on computers, marked days in gold, today filled.
- Focus and bell: Focus can begin with one breath (`FocusSettle`, switch in the start sheet, `proairetos.focusBreath`, off until chosen; the timer starts after it) and has "Set a thought aside" (an unsorted capture, no leaving the timer). Settings > Notifications has "A mindful bell" (`bell`, `bellAt`: up to three times, one line "Where is your attention?", opens Today, quiet hours hold it). The weekly review's values line adds focused minutes through connected items (plain facts).
- Trust: Support screen (`features/support/`, crisis lines, reached from
  Settings and practices, never triggered by content); public
  `public/privacy.html`; `delete-account` function; backup offer
  (`rhythm/backupOffer.ts`). Appearance: `app/appearance.ts` sets
  `data-theme` (dark default, light, system) and text size; light tokens
  in `tokens.css`. People who matter: Compass statements of type PERSON.
  `FEEDBACK_EMAIL` in `app/siteAddress.ts` shows Send feedback when set.
- Other calendars (read-only, device-only): `app/calendars/otherCalendars.ts`
  (sources + cached events in localStorage, refresh hourly on open),
  `core/calendar/readIcs.ts` (ical.js, lazy-loaded; repeats, exceptions,
  time zones). Links that block web fetches go through the Worker bridge
  `worker/calendarProxy.ts` at `/api/calendar` (https only, calendar files
  only, nothing stored). `wrangler.jsonc` runs the Worker only for `/api/*`;
  the service worker never caches `/api/`. Events show in Today's timeline
  and in Days ahead. Each calendar has a role (Just show / Counts as work /
  Counts as protected time); `blocksBetween()` turns timed events from
  counting calendars into schedule-shaped blocks for `usePersonalDay`,
  `closingFrom`, and reminder quiet hours.
- Weather (opt-in, `app/weather/weather.ts`, Open-Meteo, no key): the
  sky beside the icons on Today (`TodayWeather`), and recorded as
  `sky` on new reflections (Journal, Close the day, look-ahead plan).
  Reflect's mark: chosen inner weather, else sky, else sun/moon by clock.
  Place rounded to ~1 km, device-only; codes mapped in `core/weather/sky.ts`.
- Planning help that leaves the choice with the person: Capture's "Empty
  your head" (`core/capture/brainDump.ts`: on-device split + first guess
  of kind and named day, reviewed before saving); "Sort through"
  (`features/capture/QuickSortSheet`, plain facts from
  `core/life-items/facts.ts`); Today's "Open time"
  (`core/rhythm/openTime.ts`, gaps after blocks, events, set times, quiet
  hours; tap to give something a time); overlap notes
  (`core/rhythm/overlaps.ts`, never moves anything itself); the item's
  `light` mark and a per-day energy word (`energyFor`, never guessed) that
  only shows light things first; values beside path picks and "What would
  X look like today?" on an opened value. Insights adds when things got
  done and this period beside the last (plain counts, no arrows).
- Inner work, offered never pushed: "Think it through"
  (`core/practices/thinkThrough.ts`, `features/pause/ThinkThroughScreen`;
  CBT thought record + Epictetus, every step skippable, kept in Reflect
  only if chosen) from Pause's list, a concern's sheet, and a quiet offer
  after a Concern capture; "Come back to the room" grounding practice.
  Goals: Compass "Working toward" (statement type GOAL, `reachedAt`; items
  link by `goalId`; `core/compass/goals.ts` lists next steps and steps
  taken with dates; no percentages or targets). A goal can have a colour
  (its steps take it) and "Make time for this": a weekly PROTECTED schedule
  (`core/compass/goalTime.ts`, linked by `patternId`) whose blocks show the
  goal's next step on Today and Days ahead (`goalLines`). Never checked.
- Days ahead: two pages, routes `plan` (list) and `calendar`
  (`features/days/DaysAheadPage`), seven days at a time with week steps;
  the calendar has Week (hours), Month (Sunday-first grid with colour
  dots and a count; the chosen day lists below),
  and Year (marked days; tap a month). Opened from "Your day" on Today (tapping
  an entry passes the day and entry via `setDaysAheadOpening`). One round
  + button adds something at a time or for a day (`AddEventSheet`). Colours are the person's
  labels (`core/look/tagColors.ts`, `--tag-*` tokens, `ColorChoice`) on
  items, schedules, each shift of a schedule (`TimeBlock.color`, carried
  onto occurrences; choosing one colours every shift with the same name,
  `colorShift`; it wins over the schedule's colour), and other calendars; items and schedules also take a
  `location`.
- Meditate (`features/meditate/`, route `meditate` under Reflect, lake photo
  `assets/images/scenes/lake.webp`): Sessions (`core/meditate/sessions.ts`,
  scripts of cues spread over 5-30 min, optionally read aloud by the phone's
  speech voice), Breathe (`core/meditate/breathing.ts`, `breathAt` drives the
  circle, counts, and breath sounds from one clock; the circle is a plain
  ring until a sit starts, then a soft glow gathers around it as the breath goes out
  (`--glow` = 1 - size, the glow is box-shadows on circles the size of the ring, opacity only: a CSS blur on an SVG stroke is ignored on iPhones and showed as a hard band, so never use one) and eases away on the in-breath; the ring never changes size).
  Each kind of sit (five session types + breathing) has its own setup
  (`core/meditate/setup.ts`: length, words often/now and then/rarely/none,
  read aloud, circle pace, counts, bells, breath sounds, sounds, music);
  preferences keep only what changed. Sounds and Music tabs are switches
  ("Plays during" a chosen kind) plus a 20 s preview; nothing plays
  outside a sit except a preview. All
  real recordings in `public/sounds/*.mp3` (ambient music by Holizna, CC0, alongside the classical pieces; sources and licences in
  `docs/SOUNDS.md`). `app/sound/`: `engine` (audio clock, iPhone media
  trick `wakeAudio`/`letGo`, recordings kept in Cache Storage
  `proairetos-sounds`; the service worker skips `/sounds/`), `soundscapes`
  catalogue, `player` (`startSit`: sounds looped from decoded buffers,
  layered, + one piece of music streamed through a media element; start
  it inside the tap; `preview`).
  Breath sounds: one recorded breath split into `breath-in.mp3` and
  `breath-out.mp3`, played at natural speed as each step starts (stretching
  it sounded wrong). `SitScreen` is portalled to body.
  Nothing about a sit is recorded.
- Notifications (Settings > Notifications, `features/settings/NotificationsSection`:
  switches grouped by app (Proairetos, then each added app with its icon, `APP_NOTICES`; Hydros links to its own settings),
  then How they arrive; a lead or time beside a switch only while
  it is on, Coming up folded; keep explanations out of it):
  written on the device. `core/notify/notices.ts` (`noticesBetween`: timed
  items by their `remind` minutes, absent = at the time, [] = none; other
  calendars with a lead; own schedule blocks; check-backs and look-backs at
  9:00; an optional look at the day; quiet hours hold and re-word them;
  `privateNotice` for a private lock screen). `app/notify/`: `upcoming.ts`
  gathers sources; `notifications.ts` keeps the next 14 days in Cache
  Storage `proairetos-notify` for the service worker, shows them by timer
  while the app is open, and feeds the server only times
  (`sync/reminders.ts` `reminderTimes`). The SW's push handler shows the
  stored words (generic text only if none found); a tap opens `?open=`
  (`NoticeOpener`: item, day, Today, Reflect). Background delivery needs
  sync + the `send-reminders` function (pushes at high urgency).
  A notice reads the same either way: the app's name as the title, then the words (`show` matches `sw.js`), so a
  push replacing an in-app notice under its tag does not change it. On opening or waking, `catchUp` shows any notice
  from the last 30 minutes that neither the app nor a push showed (the phone froze the timer). Replacing server rows
  clears only rows still to come (`.gt('fire_at', now)`): a row whose time has come waits for the next minute's run,
  since the new list starts from now (this lost reminders when a device synced in that minute; tested in
  `src/tests/notify/dueRowsKept.test.ts`). Settings > Notifications says reminders come only while the app is open when
  not signed in, and has "Send one through the server" (`testReminderThroughServer`: one sealed row a minute ahead under
  source `test`, which no app's refresh clears) to check closed-app delivery on a phone.
- Search (`core/search/search.ts`, `features/search/SearchSheet`, the
  magnifier beside the gear on every main tab): items, reflections,
  decisions, Compass and added apps; every word must match, newest first,
  all on device, with scopes to narrow the archive.
- Share into Capture (Android): `share_target` in `public/manifest.webmanifest`
  sends `?share_title&share_text&share_url` to `/`; `features/share/` reads
  it once, cleans the address, and offers a Capture sheet. Bump the
  service worker cache when the manifest changes.
- End times: items take `endsAt` (Until); moving the start keeps the
  length (`movedTo` in commands, routines too); `itemSpan` uses it.
- Bring things in (Settings): `core/import/readers.ts` reads a calendar
  file (one-off events; repeats are left to Other calendars), CSV and
  Todoist exports (ISO dates only), Google Tasks (Takeout JSON), and plain
  lists; `features/settings/BringInSection` shows every row before saving.
- Photos and files on items: `attachments` store (DB 6), `services/attachments`,
  `features/items/attachments/` (photos resized to 1600px JPEG, 10 MB cap,
  viewer, remove with undo; deleting an item takes its files, undo restores
  both). On device and in backups (base64, optional so older backups still
  restore); not synced.
- `src/components/ui/useSheet.ts`: every bottom sheet uses it.
- `src/styles/globals.css` only imports `parts/NN-*.css` in cascade
  order; add new styles to the matching part (or a new last part).
  `29-touch.css` (last) keeps every control at least 44px to tap.
  Moving between places uses view transitions (`app/transitions.ts`):
  every route change goes through `go()` in App (tabs slide by bar order,
  pages push in and pop out); Proairetos follows the family's normal page
  scrolling, so main-tab changes swap content at the top under a fixed tab bar
  with extra mobile top room, and the selected tab has a sliding indicator; other page
  changes move under the dock; a page's own tabs call `transition(...,
  'panel')` and key their `.vt-panel` by tab: no snapshot there, the new
  content just slides in (Safari tinted snapshots of filtered photos green). The tab bar holds still
  (`view-transition-name`). Without support or with reduced motion,
  changes are immediate with a soft fade.
  `28-calm.css` is the calm pass: one level of borders, muted text links,
  gold kept for one main action per screen, theme tokens for surfaces.
  `28-motion.css` holds motion (ease tokens, press `scale`, sliding
  segmented highlight, tick pop, page fade: opacity only so Today's fixed
  landscape stays put). Sheets glide out via `useSheet().close` (always use
  it, not `dialog.close()`). `app/feel.ts` `tap()` buzzes on tick-off when
  Appearance > Gentle taps is on.
- `src/components/layout/`: `PageHero` (landscape header, Compass),
  `Landscape` (fixed behind the lower half of Today, fading in from halfway; tab bar sits above it), `PageHeader` (`settings`
  prop adds the gear). Settings returns to the last main tab
  (`useReturnRoute`). Today's caption is a daily Stoic line
  (`core/stoic/dailyLine.ts`, steady through the day; avoid quotes with
  banned words such as "should").
- `supabase/`: migrations (RLS on every table), the `send-reminders`
  edge function (payload-less push), and `calendar-feed` (serves the
  optional calendar subscription by secret token; deployed with
  --no-verify-jwt). The feed is the one thing the server can read, only
  if the person turns it on; built on the device by `core/calendar/`
  (ics + what to include, default commitment times titled "Busy") and
  republished after each sync (`syncController` calendar section).

## Askesis (training app, same repository)

- A second app served at `/askesis/` (`askesis/index.html` -> `src/askesis/`),
  built by the same `vite build` (multi-page `rollupOptions.input`). Its own
  manifest, icons and service worker in `public/askesis/` (scope `/askesis/`),
  so it installs as its own home-screen app. The Proairetos `sw.js` ignores
  `/askesis` entirely (never cache its page as Proairetos's shell). Linked from
  Proairetos Settings > More apps.
- Same rules as Proairetos: no streaks, scores, locks or "missed"; sessions not
  done pass with the week; moving on a week is offered (`Week N is ready`), never
  automatic; "That's the session", not praise; undo on delete.
- One path toward the person's own aim (`core/plans.ts`, `buildPath`): an
  Aim is a time ("45 minutes without stopping"), a distance (5K to marathon
  or their own), or steady (keep running; a 4-week rhythm that wraps, see
  `weekAt`). Weeks 1-10 are always the walk-run start; after that weekly
  time grows ~7.5% (5% gentler) toward what the aim needs (`needs`), running
  days are added one a week, every 4th week easier; no run more than ~10%
  past the longest of the past four weeks (`nextLongest`, Frandsen 2025),
  the long run within 40% of the week (45% on three days) and 150 min, at
  most two harder sessions a week (a long run with steady or race effort
  counts; `effortLong` alternates it with intervals on 5+ days); distance aims build 8+ weeks, then Shape, Taper and the aim's
  week; time aims end on the week whose long run is the aim. A date counts
  back (`fit`: hold weeks or fewer growth weeks, never faster). Growth stops
  when the chosen days hold no more (4 building weeks without more time).
  Everyone begins at their own week 1: `ownPath` takes the full path from the
  week they joined (`fromWeek`, ids kept so logs stay linked; `joinWeek` can
  be below 1 after a change partway; `weekAt` finds weeks by number; older
  plans migrate once, `numbering: 'own'`). Setting an aim (`PlanPage`) is three
  steps: Where you are now (a test: how long they walk briskly and run at
  once, weekly hours if 30+ min; `suggestedLevel` -> Beginner/Intermediate/
  Advanced, changeable; `placementFor` + `joinFor` place week 1, using the
  longest run too so long runs have room; or "Carry on from week N"; "Try a
  test run" (`TestPage`: walk 5 min, run until you'd walk) fills the run
  answer), Where you want to be, Your plan. Short walkers get two walking
  weeks first (`walkFirst`); a gentler path also takes the bigger walk-run
  steps twice (`startIndex` marks walk-run steps). A time aim they can
  already run says so. Keep explanation lines out of Askesis screens.
  When a week is taken again (`PlanState.again`) or runs felt hard, the
  new-week card offers "More gradually" (`moreGradual`: gentler path, same
  week number, weeks added; not with a date).
  The session screen: title, length, a session bar (`app/SessionBar`, also
  small on Home and Train), plain lines (`sessionLines`: Run/Walk), Start,
  then Log it / Lighter today, and Step by step, Why, Tips and the
  intention folded below.
  Each new week reads the log (`core/progress.ts`, `suggestWeek`): walk-run
  weeks move on when most sessions were logged; later, a week run as written
  suggests the next, clearly more carries ahead to the furthest growing week
  within ~10% of the busiest recent week and 10 min of the longest run, much
  less offers the week again or an earlier one, two hard runs offer it again.
  Home's card shows the facts, the reason, what the week builds
  (`stageBuilds`) and weeks to the aim from there; the runner picks. Train
  shows Started / Now and their own first two weeks beside the last three
  (`thenAndNow`), days run since the first (`runDays`) and how runs felt
  over four weeks as marked (`howItFelt`).
  Sticking with it, from the research: their own reason (`PlanState.why`,
  asked in Where you want to be; shown on the new-week card and before a
  run), a time and place (`runAt`, `place`) and an if-then plan (`ifThen`,
  shown on Home on the day). Run days with a time become Proairetos notices
  (`runTimes` in `app/askesis/runs.ts`, kind `run`, switch "Run days, from
  Askesis", tap opens `/askesis/`); quiet hours hold them like any other.
  `PlanState` keeps aim, own words, join
  week, date, gentler; old level plans convert (`fromOldPlan`). Tests hold
  80 combinations to the science rules. Reaching the aim shows `LookBack`
  (facts from the log; new aim / just keep running / rest a week; mark the
  Compass goal reached).
  Effort scale in `core/effort.ts`; HR zones (Tanaka, Karvonen) in `core/zones.ts`.
  Sessions in a week are never identical (beginner weeks have three close
  variants; plain easy runs are 5 min apart, the long run stays 10+ min
  longer) and every session totals a multiple of 5 min (`roundSession`
  adjusts the last stretch). Each session shows its weekday (`sessionWeekdays`);
  Home's This week has a quick Log per day (entry route `date` + `workoutId`).
- Data: workouts and the plan live in the Proairetos database (DB 7 stores
  `askesisWorkouts`, `askesisPlans`, record id `current`), so they sync,
  sealed, with the same account and key: signing in to Proairetos covers
  Askesis (`main.tsx` runs `startStore()` then `startSync()`; writes call
  `syncSoon()`; `onRemoteChanges` reloads). Device settings in localStorage.
  The server accepts the two collections after migration
  `20261003000000_askesis_sync.sql`; until then the engine holds them
  (`laterCollections`, `SyncResult.held`) and Proairetos records sync as before.
  The first version's `askesis` database moves over once and is deleted.
  Reads (never writes) the Proairetos schedule to mark sessions after nights.
- Motion: same as Proairetos: `app/transitions.ts` (tabs slide by bar order,
  pages push in, back comes forward), sliding segmented highlight (`--count`,
  `--at` set inline), press spring, choices pop, `tap()` (Gentle taps) on
  each guide step change. The phone dock is a six-column fixed bar with one
  sliding active line and a small selected-icon lift; deeper pages keep the
  parent tab selected (`lastTab`).
- Strava (More > Strava, route `strava`, `?open=strava`): `worker/strava.ts` (`/api/strava`: GET the public client id,
  POST trades a code or refresh token with the secret `STRAVA_CLIENT_SECRET`; `/api/strava/activities?after=` passes the
  person's activities through trimmed to id, type, local start, moving time, distance, heart rate and name, never routes).
  `askesis/app/strava.ts`: connect (OAuth, scope `activity:read_all`, back to `/askesis/?open=strava`, read by
  `keepStravaReturn` in `main.tsx` before the address is tidied), `bringInFromStrava` (on opening at most every 15 min via
  `StravaOnOpen`, or "Bring in now"; one undo for what came in). `core/strava.ts` `entriesFromStrava`: entries with id
  `strava-<id>` (two devices make one record), skips one already logged (same id, or same day, kind and distance within
  3%), a run or walk counts as that day's open session once. The connection (`askesis:strava`) stays on the device, out of
  backups and sync. Strava's orange button and "Powered by Strava" as its guidelines ask. On hold: since June 2026 a
  Strava API app needs its owner's paid subscription; without the secrets the page says it is not set up.
- Weather at your run (`core/runWeather.ts` `runNotes`, `hourLine`, `runHourFor`; `app/runWeather.ts`, `app/RunWeather.tsx`):
  on the day a session falls on (or was moved to) and is still open, the session page (below Start) and Home's focus card show
  the forecast for `runAt` rounded to the hour, else the next whole hour (Open-Meteo hourly + air quality, kept an hour). Notes
  only from sources (`WEATHER_SOURCES`: ACSM heat 2007 and cold 2006, WHO UV, EPA AQI), the existing Lighter today stays the way
  to ease off. The place: the phone's location once allowed ("Use where I am" from a tap; refreshed silently after 3 h when
  already granted), rounded to 0.01 and kept in `askesisDevice.place` (device only), else Proairetos's weather place. "Not for
  me" sets `askesisDevice.weatherAside`; Settings > What's included has the switch.
- One training week with Dynamis (`core/training/fitWeek.ts` `fitWeek`, tests in `src/tests/training/`; `app/family/trainingWeek.ts`):
  "Around my week" on Askesis's plan (`PlanState.fit`) or Dynamis's (`Setup.fit`) places that app's sessions still to do (from today)
  around work days (`core/scheduling/workDays.ts`: committed 4 h+ on the day it begins; `afterNightDates`) and the other app's
  sessions, the chosen weekdays as first choice; an app on set days is a fixed input. Costs: work days by the shared choice
  `proairetos.training` {workDays: free|needed|any} (free = never), long/hard runs off the morning after a night, a run and
  strength on one day only with an easy run, no leg strength the day before a long or hard run, a day between leg sessions,
  hard runs apart (sources `FIT_SOURCES`); unplaced sessions pass with the week. Every app works it out from the same records
  (Askesis's plan and log in the database, Dynamis's setup and workouts in browser storage, the schedule), so they agree; the
  answer is kept per week in `trainingWeekFit` (device only) for synchronous screens: `layOut(..., placed)` (Askesis Home,
  Workout, Entry, Strava, Proairetos `todaysRun`/`runTimes`), `isTrainingDay(setup, date, placed)` (Dynamis Today, notices,
  From your apps), Hydros's run day. `useFittedWeek` recomputes on open, sync and changes; `fitAhead` before reminders (this
  week and next). Askesis's plan code is imported only when it runs.
- Keeping training when life comes up (`features/training/TrainingClash.tsx` in App, `app/family/trainingClash.ts`,
  `core/training/clash.ts`, tests `src/tests/training/clash.test.ts`): when a timed item is set or moved in Proairetos (any
  way in; changes from sync are skipped) and it overlaps a planned run or strength session (15 min either side), or leaves
  no stretch of 06:00-21:00 that holds a session with no time, a sheet offers once: the two nearest times that day clear of
  work, events, timed items, quiet hours and the other session (`timesThatFit`), the day the week would give it
  (`fitWeekOf` trying a `notOn`), or keep both. Choices go in the synced `proairetos.trainingChanges` (`at`: a session's
  time that day; `notOn`: kept off a day, `avoid` in `fitWeek`, so a session on set days is placed again and its week is
  recorded in full), with undo; Askesis Home/Workout, `runTimes` and Dynamis notices use `trainingTimeOn`.
  Sleep is taken time for every offer (`sleepOn`): with Diaita, its planned sleep from an hour before bed (`BEFORE_BED_MINUTES`,
  Stutz 2019, `SLEEP_SOURCE`) and wind-down (`sleepTaken`), naps only with Diaita's "Scheduled naps" switch
  (`trainingClearOfNaps`, off until chosen, shown when Askesis or Dynamis is added); without Diaita, the hour before quiet hours.
  A schedule change (`scheduleService.subscribe`, 0.5 s settle, sync skipped) runs `scheduleClashes`: the next 8 days'
  sessions that a work or protected block now crowds out, keyed so only new ones are offered (named after the block).
- Your own sessions (Train > Your sessions > New session, route `own`): `core/own.ts` (`OwnSession`: warm-up, repeats of
  a work stretch and an optional rest, cool-down; `ownWorkout` makes a `Workout` with id `own-…`), kept in the setting
  `askesis:own` (backed up, synced; `app/own.ts`). `locate` in `WorkoutPage` finds them, so the guide, bells, cues and Log
  take them like plan sessions; they never count toward the plan's week. Remove has undo.
- Progress portability and plain records: `core/log.ts` finds the longest
  distance, longest workout and fastest recorded pace from run entries, and
  `logCsv` exports the full entered log (including notes and heart rate) as a
  CSV from Progress. GPS keeps distance only, so route points are not
  available for export; a watch GPX/TCX can still be brought in for review.
- Learn articles (`core/learn.ts`) cite sources; daily Stoic line and the
  optional "What part of this is up to you?" intention (`core/stoic.ts`).
- Bending to a life (`core/gentler.ts`): "Lighter today" swaps a session for
  an easier version for that day only (`PlanState.lighter`, `asToday`);
  after 2+ weeks with nothing logged (counted from the later of the last
  workout and the plan's start) an earlier week is offered once
  (`comeBackOffer`, `comeBackAsked`). After saving a new workout, `AfterPage`
  offers a minute of breathing and one line kept in Proairetos Reflect
  (promptKey `after-run`); Settings > What's included turns it and the daily
  line off.
- Askesis writes to Proairetos only when asked: "Add to Compass" on the plan
  page (`GoalLink`) makes a GOAL and, if chosen, weekly PROTECTED time on the
  run days (`goalSchedule`), linked by `PlanState.goalId`; changing the run
  days moves that time too (`moveGoalTime`, with undo). Logging from the Log
  tab on a day with an open session offers to count it as that session.
- Proairetos reads Askesis (`app/askesis/runs.ts`, Today part `askesis` in
  What's included): today's session as a row on Today (`TodayRun`), runs in
  Done today and in the Reflect timeline (`RunEntry`).
- Appearance follows Proairetos (`applyAppearance`: theme and text size);
  light tokens at the end of `askesis.css`; words over photos stay light.
- Guide (`screens/GuidePage.tsx`): wall-clock steps, spoken cues, wake lock.
  Bells for the whole session (`core/cues.ts`: two low to walk, one to run,
  one bright for faster, three to finish) are handed to the audio clock at
  Start (`app/runAudio.ts`) and again after a pause or on looking back, so
  they keep time with the screen locked while the page plays as media
  (`wakeAudio`, session `playback`). Pocket mode: black screen, hold to wake.
  Music (`app/music.ts`, More > Music): None, Songs here (files from the
  phone in IndexedDB `askesis-music`, device only, not synced or backed up;
  played through the audio clock so it softens under each bell; shuffle; Next
  song in the guide), or Another app (session `ambient` to mix; screen on).
- Distance (`core/track.ts`): More > Settings > "Distance by GPS" (`gps`, off until chosen) measures distance from the phone's location while the guide runs (`addFix`: rough fixes over 35 m set aside, standing still adds nothing, jumps faster than 10 m/s start afresh, a pause starts afresh; keeps the screen on, since web GPS stops when it locks); only the distance goes to the entry, never the points. Progress has "From a watch file": a GPX or TCX (`readActivityFile`: day, time, distance, run or walk; TCX lap totals trusted) opens a new entry to look over before saving.
- More > Settings reuses the family's Account and sync section. Passkey management reads the overlay context optionally, so it also works in Askesis and Soma, whose shells do not mount Proairetos's overlay provider.
- One picture: `src/askesis/assets/scenes/sunset-lake.webp`
  (1600×900, drawn: a lakeside path at sunset) on Home's hero and Welcome. Everything else is drawn from the
  session itself: the session page opens with day and week, title, length
  large and the main effort, a soft light in that effort's colour
  (`session-head--{effort}`) and a large session bar; Home's focus card shows
  the length in a tinted badge (`focus__length`); More ends with the
  Epictetus line alone. Learn is a numbered table of contents by topic and a
  text-first reading page (eyebrow, title, lead line, sections).

## Soma (recipes, same repository)

- A third app at `/soma/` (`soma/index.html` -> `src/soma/`, own manifest,
  icon (leaf sprig) and service worker in `public/soma/`; Proairetos's
  `sw.js` ignores `/soma`; linked from Proairetos Settings > More apps).
  Plan and what is built: `docs/SOMA.md`. Each recipe has a Nutri-Score and
  nutrients per serving (the owner's choice; switch "Nutri-Score and nutrition" in More, `healthRating`):
  `core/nutrition.ts` reads the ingredient lines into grams (units, SR28 cup weights, usual weight for one,
  cans by size, drained beans at 60%), adds USDA SR28 nutrients from `core/nutritionTable.ts` (about 270
  foods incl. sauces, cheeses, cured meats, snacks, pastry, store broth with its salt; generated by
  `scripts/nutrition/build.mjs` from the public-domain SR28 file in the npm package `fda-nutrient-database`
  (`npm pack` it into a scratch folder); `scripts/nutrition/foods.mjs` maps words to foods, `cup` given by hand
  where SR28 has none), and computes the updated (2023) Nutri-Score for general foods (`nutriScore`: salt in
  0.2 g steps to 20, sugars to 15, protein to 7 and left out at 11+ points against, fibre from 3 g, fruit,
  vegetables and legumes only, A at 0 or less; protein capped at 2 when red meat is half the dish; `parts` shown
  under "How it was worked out"). Spices are recognised before foods (black pepper is not a bell pepper).
  Herbs, spices and "to taste" lines are left out; with fewer than two lines read, or unread lines that could
  weigh more than a tenth of the dish (`roughGrams`), no grade is shown, only what
  was read. Unread lines offer "Read as…" (pick a food, and a weight when it cannot be weighed) and "Leave out";
  kept in `soma:foodChoices` (`data/foodChoices.ts`, synced as a setting; food and leave-out by ingredient name for
  every recipe, grams by the whole line) and passed to `recipeNutrition(lines, choices)`. The parser knows tblsp,
  knobs, rashers, jars and "175g/6oz" (first measure kept). Checked against ~790 TheMealDB recipes: 84% graded. Tab Nutrition on the recipe (`app/Nutrition.tsx`: grade card with its word and the A-E strip;
  kcal for a serving with the energy split from protein, carbohydrate and fat (dataviz categorical slots 1-3,
  validated for Soma's light and dark surfaces, labelled); each nutrient with a meter against EU reference
  intakes, fibre against EFSA's 25 g), a badge under the title, the letter on recipe cards. Nutrients are for one serving: the recipe's own count, else `estimateServings` (about 600 kcal or 450 g a portion, 1-16), labelled "(estimated)" with −/+ and Keep (`.nutri-serves`, `onServings` saves `servings`). The lowest grade shows as F, not Nutri-Score's E (the owner's choice; `Grade`, `.nutri--F`). Ways to try it (`core/tryIt.ts`) are optional, sourced, kept only as the person's notes.
- Recipes and groceries in the Proairetos database (DB 8 stores
  `somaRecipes`, `somaGroceries`; `data/store.ts`), synced like Askesis
  (`laterCollections` until migration `20261010000000_soma_sync.sql`; the
  old `soma` database moves over once in `startStore`); settings in localStorage `soma:settings`. Import through the Worker
  bridge `/api/recipe` (`worker/recipeProxy.ts`, JSON-LD only, nothing
  stored), pasted text, or a recipe-card photo with on-device OCR reviewed
  before parsing; Ideas from TheMealDB (direct, CORS). Groceries by
  aisle (`core/aisles.ts`, first matching phrase wins; moves remembered in
  `aisleChoices`). Reuses Askesis UI pieces and `askesis.css`, with
  `soma.css` tokens on `:root.soma`. "I cooked this" can keep a line in
  Proairetos Reflect (promptKey `after-meal`).
- Recipes from other apps (Import > File, `?open=import:app`, `file_handlers` in Soma's manifest; `core/fromApps.ts`,
  `screens/FromAnotherApp.tsx`, tests `src/tests/soma/fromApps.test.ts`): Paprika (`.paprikarecipes` zip of gzipped JSON,
  or one `.paprikarecipe`), Mela (`.melarecipe(s)`, `#` headings kept), Crouton (`.crumb`, amounts and units written out),
  schema.org JSON (RecipeSage and others) or saved pages' JSON-LD, and text/Markdown, alone or in a zip; read on the device
  with fflate. Every recipe found is listed to choose; ones already on the shelf (`alreadyKept`: same name, and same link
  when both have one) start unchosen. One chosen opens the edit page to look over; several are added with one undo.
  Photos inside the file are made small (`shrinkPhoto`, 1200 px); categories become tags, favorites stay favorites;
  ratings and nutrition are left out.
- The full recipe shelf keeps a `recipeView` setting (`cards`, `list` or
  `grid`) and the Recipes tab offers the three layouts with the selected
  choice retained on the device and in the family backup.
- Kitchen companion (`docs/SOMA.md`): Tonight (`core/tonight.ts`), your
  day from the Proairetos schedule and energy word (`app/proairetos.ts`,
  `core/dayShape.ts`, read only), kitchen list in the groceries store
  (`place: 'kitchen'`), loose week (`Recipe.planned`), marks, cook aids
  (`core/cookAids.ts`), named timers on the audio clock, swaps, seasons,
  a moment before eating, cooked for (`Recipe.cookedFor`). Proairetos reads
  recipes (`app/soma/meals.ts`, Today part `soma`): planned meals under each
  day in Days ahead, "Cooked for" in Reflect (`MealEntry`).
- Use soon and weeks ahead (`core/soon.ts`): a kitchen thing may have `useBy`; putting away (`bringHome`) and adding by hand
  offer a first guess from the short end of USDA FoodKeeper fridge times for common fresh foods (`keepsAbout`,
  `KEEPS_SOURCE`, shown under the kitchen list), changeable per row (Today / Tomorrow / 3 days / A week / 2 weeks / No
  date). The kitchen lists dated things soonest first; Home's "Use soon" card names what is due within two days and up
  to three recipes using it (`soonItems`, `recipesUsing`). Facts only ("Use by Thu", "Use-by was Tue"). The Week page steps
  up to three weeks ahead; "Repeat the week before" places last week's meals on the same weekdays (`repeatWeekBefore`,
  undo); Groceries for these covers the week shown.
- Groceries take only things to buy (`isGrocery`, `cleanLine` in `soma/core/groceries.ts`): list numbering is taken off ("2. Black beans"); notes in brackets, rules (———), emoji or "Optional / Upgrade" titles, headings and cooking steps are left out. The Groceries page offers "Tidy the list" for lines saved before that.
- Reading recipes: `readIngredient` takes "plus" amounts, can sizes, "juice
  of", size words and uses into notes; `boughtAs` buys juice as fruit; ranges
  merge at both ends; `fromText` reads part headings, Notes and labelled times.
  Units (As written / Metric / US, recipe page and Settings): Metric weighs
  common dry things by `weightPerCup`; oven heats round to dial steps. No
  stand-in dish photos: `DishImage` (tinted card with the initial).
- In season (`SeasonPage`, `ProducePage`, routes `season`, `produce`): ~45
  items in `core/seasons.ts` with months, match words (whole word + plural,
  `notAfter`), TheMealDB photo (fresh only) and lookup names, keeping notes;
  Home shows a card that opens it. TheMealDB calls live in `app/mealdb.ts`.
  Produce photos are kept offline by `public/soma/sw.js` (`produce-photos`).
  "I cooked this" offers "Add a photo?" when a recipe has none.
- Shared grocery list (Groceries > Shared; migration `20261018000000_shared_lists.sql`): `core/sharedList.ts` (invite link `/soma/?open=list:ID#k=KEY&n=NAME`, `readInvite`, pending changes laid over the server copy with `withPending`/`queue`), `data/sharedLists.ts` (lists in the synced setting `soma:sharedLists`; items cached in `somaShared.items.ID` with unsent changes in `somaShared.pending.ID`; each line sealed with the list's AES key, AD `soma-list:LIST:ITEM`; joining sends `joinProof` = SHA-256 of the key to `join_shared_list`; pulls every 15 s while visible). `screens/SharedList.tsx`: join card for an invite (kept in sessionStorage by `main.tsx`, which takes the key out of the address), make a list, add, tick, remove with undo, clear ticked, "Add my list to it", invite (share or copy), leave. Both people need an account (any; sign-in only, no passphrase needed for the list). The tables' row rules were checked on Postgres 16: strangers see nothing and cannot join without the proof.
- The language guard covers it: no `loading="lazy"` (write images without it).

## Testing approach that has worked

- Unit tests for domain, services, repositories (fake-indexeddb), sync
  engine with a fake server, crypto. Run time-sensitive tests in several
  time zones (`TZ=Pacific/Auckland npx vitest run`).
- Browser checks with Playwright against `npm run build` + `vite preview`.
  Chromium is at `/opt/pw-browsers/chromium` (pass `executablePath`).
  Use `page.clock` for time; exact selectors (`getByRole(..., { exact })`)
  because `text=` matches substrings.
- Sync was tested end to end with a stand-in Supabase via `page.route`,
  and the SQL migration against a local Postgres 16 with stub `auth`.
- Avoid `pkill -f <pattern>` in a shell command that contains the
  pattern; it kills its own shell. Use `kill $(pgrep -f "[w]rangler")`.

## Status

Built: capture, sorting, item sheet, routines, waiting/check-back,
scheduling with rotations, Today timeline and countdowns, Compass (values,
statements, look-ahead with obstacle plan), focus timer, pause (MBCT
breathing space), decisions journal, Reflect (observations, prompts,
weekly review), backup/restore/delete, deletions with undo, back
navigation, offline PWA, encrypted sync + reminders (code complete).

Server setup is done by the user (sign-in and sync work live; check reminders
with a real phone). The owner's open to-dos (server steps, phone checks, choices) are in `docs/TODO.md`;
add to it when something ships that needs them, and tick off what they confirm. Steps are in
`docs/SERVER_SETUP.md` (Site URL, copy URL + publishable key, VAPID keys,
Cloudflare build variables, deploy function, cron). Sign-in accepts the
email's link (templates are locked on the free plan without custom SMTP).

Calendar subscription: code complete, needs the server (second
migration + `calendar-feed` function); the download-a-file option works
without it. Not yet tested against a live Supabase.

Not yet verified on a real phone: swipe gestures, fonts (EB Garamond and
Google Sans Flex, bundled via @fontsource), real Supabase emails and push delivery.

## Diaita, Philia and Ergon (same repository)

- Three more apps at `/diaita/`, `/philia/`, `/ergon/` (`<app>/index.html` -> `src/<app>/`, own manifest with
  shortcuts, icons, screenshots and `sw.js` in `public/<app>/`; Proairetos's `sw.js` skips them). They share a
  lighter shell: `app/family/startApp.tsx` (appearance, sync, daily copies, `notifications.start()`, worker),
  `app/family/shell.tsx` (`stored` settings, `collection` = one localStorage key per record so sync carries each
  on its own, `useRoutes` with back, `TabBar`, `Brand`, `Welcome`, `Shell`, `offerUndo`/`say` + `UndoBar`
  `.family-toast`), `app/family/icons.tsx` (line icons, `AppMark`), `app/family/apps.css` (shared pieces) and
  `askesis.css`, with colours on `:root.<app>` in `src/<app>/styles/`. Each has its own drawn scene in `assets/images/scenes/` (`diaita`: night sky turning to dawn; `philia`: two trees by a warm lake; `ergon`: a house with a lit window in a sage valley; each also `-wide`, 852×1846 / 1672×941), on its welcome and home hero. Records live in browser storage under
  `diaita:`, `philia:`, `ergon:` (backed up, synced as `preferences`).
- Diaita (`core/rhythm.ts`, tests): `planBetween` turns the Proairetos schedule (COMMITTED blocks; a night is a
  block running through 03:00) into sleep, wake, wind-down, last caffeine (`cutoffHours`, Drake 2013), nap
  before a first night (90 min ending an hour before leaving, Ruggiero 2014), bright light in the first half of
  a night and sunglasses home when another night follows (Smith/Eastman 2009), main meal before and small
  snacks 00:00-06:00 on nights (Chellappa 2021), a short sleep after the last night, earlier bed before an
  early start, later after a late finish, two hours later the night before a first night (Smith/Eastman); an
  evening's sleep, wind-down, last caffeine and last big meal keep their own day (`Entry.day`) even after midnight. Every line can open its source; Settings (More) holds bedtime, sleep
  hours, travel, getting ready, cutoff, wind-down, Light and Meals switches. Grouped by the person's day
  (`useDays`). Morning check-in: how you slept (Well/Okay/Poorly, optional), bed/up times (`diaita:sleep:DATE`)
  and the shared energy word (`setEnergy`). Week, Day, Sleep log with plain facts (`sleepFacts`), Sources. Sleep also
  offers a chosen 10–20 minute Wind down (`screens/WindDownPage.tsx`) with Meditate's sounds, bell and spoken cues,
  a dim Can’t sleep screen (`screens/CantSleepPage.tsx`), and weekly amount/regularity facts (`sleepWeekFacts`).
  The Sleep page reads in one order: Your sleep (one card: 2-week average and nights logged, this week against the chosen
  amount, bedtime and waking variation), the 14-night chart, Nights (Add at its head, 14 shown then All, a pill per night
  sized to its hours, `shortHours`), then Look closer (suggestion, side by side, the two-week try folded until opened).
  Worry time is an early-evening entry with its own reminder and a synced `diaita:worry:` list of worries and one next step; each row links straight into Proairetos Think it through. Sleep offers sourced room guidance (about 60–67 °F, dark, quiet, phone away).
  Sleep shows source-backed regularity and doctor suggestions with Not for me, records side-by-side comparisons for Askesis runs, Dynamis training,
  Hydros caffeine after cutoff and scheduled night shifts when both groups exist, and offers two-week experiments (fixed wake time,
  caffeine cutoff, morning daylight) with the recorded amounts beside the previous two weeks.
  Morning daylight (15 to 30 minutes, outside if you can) follows each wake that is not after a night, with its own
  source (`morning-light`: Khalsa 2003, Blume 2019).
  Notices kind `rhythm` (`core/notices.ts`: wind down, worry time, nap on; last caffeine and morning daylight off), not held by quiet hours.
- Philia (`core/people.ts`, tests): people (`philia:person:ID`) with birthday (year optional, 29 Feb on the
  28th), other yearly dates, who they are, Remember lines, gift ideas (mark given), times together, and an
  optional keep-in-touch rhythm that, when it comes round, says only how long it has been (`sinceText`).
  Home: Coming up (30 days), Keep in touch, Times together. More: bring in Compass people (`fromCompass`),
  reminder choices (dates on the day or days before, keep in touch, time). Notices kind `person`, opening
  `philia:person:ID`. People brought in keep `compassId`/`compassName`; a rename in Compass carries over on
  opening Philia unless they were renamed in Philia since (`followCompass`). `?open=person:ID|add|people`.
  In touch in one tap (person page: Called / Messaged / Saw them; `logContact` keeps a `TimeTogether` with `how`, moves
  `lastInTouch`, undo, then an optional line about it); Home's "In touch today" logs `touch`. "Together and in touch" is one
  timeline per person (`timeline`, `timelineText`: contacts, times together, gifts given; newest first, 8 then All).
  Your year counts calls and messages apart from times together.
  Add a date (route `date`, `?open=date` or `date:PERSON`; `screens/AddDatePage.tsx`, from Home's Coming up and a person's
  Dates): who (or someone new), Birthday / Anniversary / Other, every year or once (`PersonDate.once`, full date, optional
  `time`), with undo; `withDate`, `timeText` in `core/people.ts`. Once events show in Coming up, notices and Proairetos's
  Days ahead lines until their day; the edit form keeps and changes them. Events with a time are entries (an hour) on
  Today's timeline and in Days ahead's calendar (`app/calendars/philiaCalendar.ts`, beside Poreia's; not in the published
  calendar), count as busy for open time and the training offers, and leave the quiet lines (`birthdaysOn` skips them).
- Ergon (`core/chores.ts`, tests): chores repeat every N days or weeks from when last done, on days of the
  week, monthly (31 = last day) or once; a day that came stays "Since Tue" until done or skipped (never
  late); done late comes round one interval later; take turns (`rota`, passes on each time); Ideas chips;
  who did what in 30 days as plain counts. One shared household per person through `createSharedLists`
  (`ergon:households`, cache `ergonShared`, AD `ergon-list`; invite `/ergon/?open=home:ID#k=KEY&n=NAME`, read in
  `main.tsx`); sharing moves this phone's chores in, leaving keeps a copy. Notices kind `chore`: one per day
  naming that day's chores at the usual time, or at a chore's own `remindAt` (optional, on the chore page);
  optional "Only mine" (More: your name here).
  Steps (`Chore.steps`, optional, one per line in the form, `stepsFromText`, at most 20): ticked on the chore's page
  (`toggleStep`), cleared by `markDone`. Today shows room chips when its chores span two rooms or more (`roomsOf`) and, in one
  room, "Mark all of these done" with one undo.
- Ergon days off (More > "On days off", `ErgonSettings.daysOff`, off until chosen): `nextDay(chore, daysOff)` moves a chore
  that comes round on a work day to the next day off within two weeks (`dayOffFrom`); only chores every 2+ days, weeks,
  monthly or once, and not someone else's turn (`movesToDayOff`); counting still runs from when it was done. Work days are
  committed blocks of 4 h+ on the day they begin (`core/scheduling/workDays.ts` `workDates`), read by `ergon/app/daysOff.ts`
  (`useDaysOff` for pages and Proairetos's From your apps, `daysOffNow` for notices). Today keeps the Ideas chips under the
  lists while there are fewer than five chores (the Chores page always has them). The chore page says "Moved from Tue, a work day."
- In Proairetos: Settings > More apps rows; Notifications switches "Sleep and naps, from Diaita", "Birthdays,
  from Philia", "Chores, from Ergon" (`rhythm`, `people`, `chores` in NoticeSettings; notices from
  `app/notify/familyNotices.ts`); What's included parts `diaita` (tonight's sleep on Today), `birthdays`
  (next week on Today) and `birthday-dates` (Days ahead lines beside bills, `birthdaysOn` in `glance.ts`),
  `chores` (chores whose day came on Today) in `features/today/TodayNewFamily.tsx`; search finds people and
  chores.

## Therapeia, Dynamis and Ktema (same repository)

- Three more apps at `/therapeia/`, `/dynamis/`, `/ktema/`, on the newer apps' shell (`startApp`, `shell.tsx`), wired like
  Diaita, Philia and Ergon (manifests, icons, `sw.js`, `_headers`, Proairetos `sw.js` skips them, `ADD_ONS`, backup
  prefixes `therapeia:`, `dynamis:`, `ktema:`, reminder sources of the same names, `ACCOUNT_PAGE`). Drawn scenes by
  `scripts/scenes/more-apps.mjs` (`therapeia` misty blue lake, `dynamis` amber peaks, `ktema` barn in golden fields).
- Therapeia (`core/medicines.ts`, tests): medicines with dose times at a clock time, after waking or before sleep
  (`DoseTime`); waking and sleep come from Diaita's `mainSleeps` around the Proairetos schedule (`anchorsFrom`, Diaita's
  settings or its defaults), so doses follow nights. Days daily / weekdays / every N; a course end; as needed with the
  person's own spacing (`spacedFrom`, said plainly, never advised); supply counted down by doses marked
  (`supplyLeft`, `refillDay` lead days before running out, `refill`). Marks are Taken / Skip with undo; unmarked doses
  pass with their day. Visits with questions to tick and notes. Health card (allergies, conditions, contact) and "Share
  the list" (`listText`). Notices (`core/notices.ts`): doses kind `dose` (not held by quiet hours; names only if
  "Names on the lock screen"), refills and visits kind `care`. Welcome and More say it gives no medical advice.
- Dynamis (`core/library.ts`, `core/plan.ts`, `core/mobility.ts`, tests, sources in `SOURCES` / `WHY`, shown on "How the
  plan is built"): full-body A/B sessions on 2-3 days or upper/lower on 4, each major group twice a week (ACSM 2026,
  Schoenfeld 2016); 2 sets to begin, one more offered after six sessions up to the aim's full number (`setsOffer`,
  Schoenfeld 2017 volume); reps by aim (Lopez 2021); stop 1-3 reps short (Robinson 2024, Helms 2016); when every set
  reaches the top, about 5% more (2-10%, ACSM 2009, `nextWeight`) or the next bodyweight ladder step is offered, never
  applied; longer rest for big lifts (Schoenfeld 2016); after 14+ days away a ~10% lighter start is offered. Places:
  gym, home with dumbbells, no equipment (ladders in `LADDERS`); "Do instead" swaps an exercise (`alternatives`,
  `Setup.swaps`). The live session (`SessionPage`) keeps a device-only draft (`dynamisDraft`, not synced), rests on the
  audio clock (`praxis/bell.ts`), and saves a `Workout`. Mobility routines with a guided timer and bell
  (Thomas 2018, Afonso 2021). Training-day notices kind `training` (off until chosen).
- Dynamis exercise pages (route `exercise`, `?open=exercise:ID`, opened from Log's Then and now; `core/history.ts`): every session's sets newest first (`exerciseHistory`), the heaviest set and most reps as plain records (`exerciseRecords`), a line over time. Barbell lifts (`BARBELL`: back squat, Romanian deadlift) get a plate calculator (`platesFor`: usual plates largest first, says what is short; bar weight in `Setup.bar`) and a Plates line on the session.
- Ktema (`core/things.ts`, tests): things (category incl. Documents, place, make, model, serial with Copy, bought,
  price, store, warranty or renewal date with 1/2/3/5-year picks, manual link, odometer readings) and upkeep every N
  days/weeks/months/years, or by distance for a car, whichever first (`nextDue`, estimated from readings); days that
  came read "Since Tue", never late; Ideas chips with "Common times; the manual has the ones for yours." Notices kind
  `upkeep` (one per day, and a month before a warranty or document ends).
- Ktema rooms and insurance (`core/insurance.ts`): a thing's place is its Room (datalist of rooms used); Things groups by Kind or Room (`byRoom`, case ignored, unplaced last). Print has "By room, with prices" (route `print` with `insurance`, `?open=insurance`, also an Insurance list button on Things): a table per room with its total, all rooms' total (`readPrice` reads prices as written, `totalOf` adds by currency mark and says how many have no price) and Download (CSV) (`thingsCsv`, the amount as a number beside the price as written).
- Therapeia history and care circle: each save writes what changed (`core/history.ts` `withChanges` from `putMedicine`:
  started, dose, times, course, stopped, started again, refilled; `Medicine.changes`, last 40), shown as History on the
  medicine and as "Recent changes" (six months, refills left out) on the printed sheet. Undo uses `restoreMedicine` (no
  change written). A care circle (More > Share with someone who helps, route `circle`, invite
  `/therapeia/?open=circle:ID#k=KEY&n=NAME` read in `main.tsx`; `createSharedLists` with `therapeia:circles`, cache
  `therapeiaShared`, AD `therapeia-list`) holds the medicines while there is one (`useMedicines`, `allMedicines`, used by
  Therapeia's pages, Proairetos's From your apps, notices and search); a shared medicine is trimmed to fit one sealed
  item (`forSharing`: ten days and at most 30 marks, 12 changes, the supply recounted from the oldest mark kept so what is
  left stays the same). Readings, visits and the health card stay on the phone. Leaving keeps a copy.
- Shared list (Proairetos, `app/together/together.ts`, `core/together/sharedTodos.ts`, tests `src/tests/together/`): one
  to-do list kept with the people at home through `createSharedLists` (`proairetos.together` setting, cache
  `proairetosTogether`, AD `proairetos-list`; invite `/?open=together:ID#k=KEY&n=NAME`, read in `main.tsx` into
  sessionStorage and taken out of the address). `TodayTogether` sits after Today's to-do once a list exists (or a join
  card for an invite): add, tick (`doneAt`, `doneBy`, with undo), remove (undo), done ones from the last two days folded
  (`arrange`), pulled every 15 s while in view. Settings > The app > Shared list (view `together`, `TogetherSection`):
  make, invite, join, leave (open to-dos kept as the person's own to-dos, one undo). Needs sign-in, not the passphrase.
- Therapeia for the family: `Medicine.who` / `Appointment.who` (absent = the person's own; `whoOf`, `peopleIn`, `withWho`
  "Mia: Amoxicillin", `sameWho` in `core/medicines.ts`). `WhoChoice` (`app/ui.tsx`) in the medicine and visit forms: a
  "For someone else" link until a name exists anywhere, then chips Me / names / Someone else. Shown in dose rows (a
  `.who-chip`), Today's hero and lists, Medicines (chips Everyone / Me / names filter the page; Share and Print follow:
  `listText(..., who)`, route `print` with `who`; another person's sheet leaves out the health card and readings), visits,
  notices (names on: "Mia: X, 5 ml"; off: "A medicine for Mia", "A refill for Mia"), Proairetos's From your apps and search,
  Poreia's packing line and Your year. Kept through `forSharing` for a care circle.
- Daily thoughts (`app/family/dailyLines.ts`, `DailyLine.tsx`): Diaita, Philia, Ergon, Therapeia, Dynamis and Ktema each
  show one line a day at the foot of their first page, Stoic and Buddhist days in turn, with translator or
  "(paraphrase)"; a "Daily thought" switch in each More (`proairetos.dailyLines`). Keep banned words out of quotes.
- In Proairetos: What's included parts `medicines`, `training`, `upkeep` (`TodayNewFamily.tsx`); Notifications
  switches `medicines`, `training`, `upkeep`; search finds medicines, visits, things and upkeep.
- Philia people may have a phone and email (Call, Message, Email on their page).
- Second round: Therapeia readings (`core/readings.ts`: blood pressure, blood sugar, weight, temperature, heart rate,
  oxygen, other by name; latest and 30-day lowest/highest/average as facts, no ranges; tab Readings, `?open=readings`,
  "With latest readings" on the shared list). Dynamis: Askesis run days beside lifting days (read only, `askesisPlans`,
  `fromRunDays`), optional warm-up sets for big lifts (`warmUp`), an after page (`AfterPage`: facts, a line kept in
  Reflect with promptKey `after-strength`, mobility after training). Ktema: photos and files per thing in IndexedDB
  `ktema-files` (device only, `data/files.ts`, `ThingFiles`, resized by `prepareFile`), and an upkeep cost can go into
  Oikonomia's Spent for the month (area by category; undo takes both back). Diaita: nap timer (`NapPage`, `?open=nap`,
  10/20/30 min from Brooks & Lack 2006, 90 min from Ruggiero 2014; bell on the audio clock; end kept in `diaitaNap`).
- Third round: Dynamis exercise figures (`core/figures.ts` point poses, `figureSvg.ts`, `app/ExerciseFigure.tsx`); shared
  charts (`app/family/charts.tsx` LineChart / ColumnChart, `charts.css`: Therapeia readings, Dynamis Over time, Diaita sleep).
  Medicines, visits, things, upkeep and chores open as a view (`detail-head`, `detail-list` in `apps.css`) with Edit
  toggling the form (`<X>Form` / `<X>View` / wrapper). Therapeia `Medicine.look` (`PILL_SHAPES`, `PILL_COLORS`,
  `app/PillMark.tsx`). Philia photos on the device only (`philia/data/photos.ts`, IndexedDB `philia-photos`, square
  480px JPEG; `Initials` takes `id`). `app/family/SwipeItem.tsx`: pull left to mark a row (doses, chores, upkeep, keep in
  touch; left arrow too). `Empty` in `shell.tsx` for empty lists. Therapeia and Ktema open their first form after Welcome.
- Onboarding (`features/onboarding/steps.ts`) has two panel steps before Make it yours: "On your Home Screen"
  (`components/HomeScreen.tsx`: steps for this device first, `INSTALL_STEPS`/`deviceKind` in `app/install/installPrompt.ts`,
  which keeps Chrome's `beforeinstallprompt` from page load for an Install button; says so when already installed) and
  "More apps" (`components/MoreApps.tsx`: the twelve add-ons from `familyApps`, how to add and install them, Open the Store).
- Premium round for the older apps: Askesis Progress and Oikonomia Spent use the shared `ColumnChart` (8 weeks; six
  months); Askesis entries open as `EntryView` with Edit (`EntryForm`); Soma groceries swipe to tick. `SwipeItem` and
  `Empty` (`app/family/Empty.tsx`, class `.list-empty`; `.empty` is Askesis's older style) carry their own CSS
  (`swipe.css`, `empty.css`) so any app can use them. Askesis light `--mint` is `#24724f` (5.3:1 as text, 5.8:1 under
  white). Praxis's Time bars and Hydros's Flow keep their own drawn charts.
- Each app stands alone: a link, offer or mention of another app shows only when that app is added (`isAdded` /
  `useAddedApps`: Askesis's Hydros link, Hydros's run-day addition, Theoria's Praxis link, Praxis's Theoria books, Soma's
  Oikonomia budget hint, the backup card's Theoria line, Therapeia's waking and sleep, which it sets itself when Diaita is
  not added, writing Diaita's same setting). `scripts/family-check/` holds two browser checks: `alone.mjs` (each app
  with only Proairetos) and `together.mjs` (everything added; reads, writes on request, search, notices, live updates,
  removing an app, appearance). A bill added after its lead day is reminded on the due day (`billReminders`).
  `openSettingsAt` ignores unknown views.
- Printing (`app/family/PrintSheet.tsx`, `print.css`): `PrintSheet` (Back, Print, the page's chips, then a white sheet with
  title, the name and date), `PrintPart`, `PrintTable` (scrolls sideways on a phone). On paper only the sheet prints
  (`:has()` hides everything that neither holds it nor sits in it). Therapeia route `print` (Medicines > Print, `?open=print`:
  current medicines, health card, latest readings and the next visit's unasked questions as chips); Ktema route `print`
  (Things > Print the list, `?open=print`: by category, one kind or all, upkeep as a chip).
- Your year (`app/family/YearPage.tsx`, `year.css`, `core/year/year.ts`): each app has a pure `<app>Year(...)` in its core
  (`core/year.ts`; Praxis `praxis/year.ts`) returning `{ facts, lists }` (counts, totals and the person's own lines; a fact
  with nothing to show is left out; nothing compared or ranked against a target; Therapeia leaves doses out, Oikonomia
  counts only payments recorded). Years with records are chips. Opened from More (`year` route) in the shell apps,
  Askesis, Soma and Oikonomia; from Flow in Hydros, Time in Praxis and Settings in Theoria (inside `.family-surface`,
  which now also styles `.chip`, `.title`, `.back-link`). Tests in `src/tests/year/`.


## Phyton (plants, same repository)

- Fourteenth app at `/phyton/`, on the newer apps' shell (`startApp`, `shell.tsx`), wired like Ktema everywhere (`ADD_ONS`, backup prefix
  `phyton:`, reminder source `phyton` with notice kind `plant`, NoticeSettings `plants`, Today part `plants` (`TodayPlants`), search,
  `ACCOUNT_PAGE`, `sw.js` paths, `_headers`, welcome and privacy pages). Scene by `scripts/scenes/phyton.mjs` (a glasshouse in a green valley).
- `core/species.ts`: about 85 types (houseplants, succulents, herbs, vegetables, garden) with light, how dry before watering (`Dryness`),
  starting days, humid, feed weeks, toxic to cats/dogs as the ASPCA lists it (undefined = not listed, said so); `findSpecies`,
  `speciesForLatin` (exact Latin, else the one type of that genus). Sources in `CARE_SOURCE`.
- `core/plants.ts`: a plant comes round to be **checked**, not watered on a day. Watered / Still moist (`stillMoist` waits 2-3 days,
  `checkFrom`); `learnedEvery` = middle of the last five gaps between waterings (each taken back to summer length), once there are two;
  `seasonFactor` 1.5 Dec-Feb, 1.25 Nov/Mar (by hemisphere, guessed from the time zone, changeable in More); rain of 5 mm+ counts for
  `outside` plants (`app/rain.ts`, Open-Meteo daily rainfall, place device-only in `phytonDevice.*`, falls back to Proairetos's weather place);
  feeds only Mar-Sep (`nextFeed`, `toFeed`). Never "late": "Since Tue". The record keeps 40 marks (a shared record is sealed under the
  server's 4,000 characters); `tally` counts by year for Your year.
- Identify (`screens/IdentifyPage.tsx`, `app/identify.ts`): up to three photos with the part shown, made small on the phone, POSTed to
  `/api/plant` (`worker/plantProxy.ts`: same origin only, JPEG/PNG/WebP under 2 MB, rate limited, secret `PLANTNET_KEY`, Pl@ntNet
  `v2/identify/all`, 404 = no match). Matches show the score; a match in the table says "Care notes", one by genus "Care as for X".
  The first photo starts the plant's photos (`holdPhoto`).
- Photos per plant on the device only (IndexedDB `phyton-photos`, `data/photos.ts`, 1200 px JPEG), removed after a plant's undo window.
- Shared home like Ergon (`createSharedLists`, `phyton:homes`, AD `phyton-list`, invite `/phyton/?open=home:ID#k=KEY&n=NAME`, `screens/HomePage.tsx`).
- Outside (`core/outdoors.ts`, switch "Weather outside" = setting `rain`): `app/rain.ts` also keeps the next three days' lows and highs
  (`forecastNow`, `useForecast`); frost tonight (tomorrow's low at or under 2 °C) is a card on Today and a 17:00 notice naming the plants
  outside; a hot day (30 °C+) brings plants outside round a day sooner (`nextCheck`'s `hot`), said on Today. °F follows Proairetos's weather unit.
- Away (`settings.away`, More > Away): no plant notices on those days; the day after, one "Back home" notice names what came round
  (`plantNotices` takes a `NoticeContext`). "Sheet for whoever waters" (route `sitter`, `?open=sitter`, `core/sitter.ts`): one block per
  plant (how dry, about how often this month, notes, pets) to print or send as text.
- Plants page: "Watered all" per place, one undo (`wateredAll`). A plant's photos: Then and now (first and latest, "7 months apart",
  `apart`) and a sideways strip of every photo.
- Care journal: a plant's page also marks Pruned, Pests seen (what and where, optional) and Note (`journal`, kinds `prune`, `pest`, `note` with `text` up to 140 characters, in the same record; no effect on watering). A shared home's plant is trimmed oldest marks first to fit the sealed size (`fitForSharing` in `putPlant`, never below ten marks). Plants has place chips when there are two places or more.
- Links: `?open=today|plants|more|add|identify|home|sitter|plant:ID`.


## Poreia (trips and time off, same repository)

- An app at `/poreia/`, rebuilt from scratch on the newer apps' shell (`startApp`, `shell.tsx`); the first
  version's IndexedDB stores are cleared once after `FreshPage` offers Save a copy (`app/fresh.ts`). Records are
  `collection`s in browser storage (`poreia:trip:`, `booking:`, `plan:`, `pack:`, `spend:`, `off:`; `poreia:settings`),
  backed up and synced as preferences. Scene by `scripts/scenes/poreia.mjs` (a coast at dusk with a lighthouse).
- Core (`core/`, tests in `src/tests/poreia/`): `model.ts` (trips with idea/planning/booked, bookings by kind, days
  from bookings and plans, money totals converted by `ratesInto`), `confirmations.ts` (`readConfirmation`: provider,
  kind, dates, times, cost, confirmation code from a pasted email or schema.org JSON-LD), `links.ts` (`searchLinks`:
  stays, flights, cars, trains, cruises, events, tours, food on outside sites with place and dates filled; booking
  happens there), `packing.ts`, `timeOff.ts` (balance from a starting amount, accrual, optional cap; `hoursFor` counts
  the work shifts in the dates, else usual day hours), `calendar.ts` (`poreiaEvents` for Proairetos).
- Two ways with Proairetos (`app/proairetos.ts`): hours are read from the schedule (`scheduleService`); approved time
  off replaces those days' shifts with an empty day (`changeDay`) and keeps what was there (`TimeOff.replaced`), so
  canceling, deleting or moving restores it. Planned and requested time off only show (tentative) in Days ahead
  through `app/calendars/poreiaCalendar.ts`.
- Outside services (`app/world.ts`, cached in `poreiaCache.*`): Open-Meteo places, forecast and last year's weather,
  Wikivoyage/Wikipedia, Frankfurter rates, Nager.Date holidays, REST Countries, and events through the Worker
  `/api/travel/events` (`worker/travelEvents.ts`, secret `TICKETMASTER_KEY`, optional).
- In the app as much as allowed (no provider lets its site be framed, and booking is theirs): Around (trip view `around`,
  and in Explore; `components/Around.tsx`) is a map (`MapView`: MapLibre loaded only when a map shows, OpenFreeMap
  `dark`/`positron` styles, no key; pins by category, credit folded) over one row of kinds; each kind joins Wikivoyage's own
  listings (`readListings` in `core/spots.ts` reads `{{see|do|buy|eat|drink|sleep|listing}}` from the page's wikitext, with
  district pages when the main page has few; `{{EUR|25}}` kept) and OpenStreetMap through Overpass (`overpassQuery`,
  `readOverpass`; three public servers tried in turn). Events come from Ticketmaster. A place opens `PlacePage` (route
  `place`): map, directions (Apple Maps on Apple devices), website, call, hours, price, Save to a trip (collection
  `poreia:spot:`, `ref` keeps the found id; Overview's Saved places) and Add to a day. Stays with prices (LiteAPI, Worker
  `/api/travel/stays`, secret `LITEAPI_KEY`) and flights (Duffel, `/api/travel/flights` and `/airports`, secret `DUFFEL_KEY`)
  show in Find and book when `GET /api/travel` says they are set up (`worker/travelSearch.ts`, tests); booking opens on the
  provider with the stay's name or the flight numbers (`stayLinks`, `flightLink`). Amadeus's self-service APIs closed in
  July 2026, so they are not used.
- Getting around (`screens/TripPage.tsx`, `components/TripDays.tsx`, `screens/PlanPage.tsx`): trip tabs Overview, Days, Bookings,
  Around, Packing, Money; a trip on now opens on Days, and each trip remembers its last tab (`lastView`) as Around remembers its
  kind (`lastShown`), so coming back from a place or booking lands where the person was. `NextUpCard` (`nextUp` in `core/model.ts`)
  leads Overview and, for a trip on now or within 30 days, the Trips page. Every day line is an `AgendaRow` opening the booking or
  the plan (route `plan`: change, move to another day, directions, delete with undo). A booking opens as `BookingView` (big
  confirmation, tap to copy; directions; link) with Edit. Plans keep `lat`/`lon`/`url` when added from a place or event, for
  directions and the day's map; Share the plan sends `planText`. Nearby places come through the Worker `/api/travel/near`
  (`worker/travelNear.ts`: Overpass servers together, Nominatim special phrases after 4 s, one a second; kept at the edge a day).
- Reminders (`core/notices.ts` `tripNotices`, kind `trip`, source `poreia`, NoticeSettings `trips` "Bookings and plans",
  choices in Poreia More: `settings.notices` travel lead, other lead, flight check-in 24 h before, the evening before at
  18:00 with the first thing and what is left to pack); a tap opens `poreia:booked:ID`, `poreia:plan:ID` or the trip. Times
  are the phone's local time. Timed plans also show in Proairetos (`poreiaEvents` takes plans).
- Days: Add to your calendar (`tripEvents` + `buildIcs`: the trip, every booking, a stay's check-out, the plans); untimed
  plans keep `order` and are pulled by a grip on the left (`.poreia-grip`, pointer capture, arrow keys too, `moveAmong`,
  undo; `data-menu-skip` keeps it out of the long-press menu, a hook in `behaviors.ts`).
- Time there (`core/timeZones.ts`, `components/TimeThere.tsx`): the clock at the place (or home while away) and hours apart,
  from `Place.timezone` and the home place or the device; for 3 h or more, `sleepShift` (an hour a day for up to three days,
  morning light going east, evening going west; Eastman & Burgess 2009), from Diaita's bedtime when it is added.
- Keep for offline (`app/offline.ts`, `OfflineCard`): guide, listings, every kind nearby, forecast and country facts kept
  as answers, and the map around the place (`tilesAround`, zooms 10-16, at most 450 tiles, both styles' symbols and fonts)
  put straight into Cache Storage `poreia-map`, which `public/poreia/sw.js` answers tiles from first (styles and the tile
  index fresh when online); when kept is noted in `poreiaOffline.<trip>` (device only).
- With the family (all only when added, all asked first, undo): Proairetos Today part `trips` (`TodayTrip`: under way or
  within 3 days, its next thing, what is left to pack), search (trips, bookings by confirmation, plans), and
  `app/connections.ts` (loaded only when a trip page asks, so Poreia's first chunk carries no other app): Phyton's away
  dates, Therapeia's medicines with the doses the days take onto the packing list (`TripWithApps`), the trip's spends into
  Oikonomia's Spent by month in its currency (ids `poreia-<spend>`, `ToOikonomia` on Money). Back from a trip in the last
  14 days, the Trips page offers one line kept in Reflect (`LookBack`, promptKey `after-trip`, `Trip.lookedBack`).
- Stops (`Stop`, `Trip.stops`, `placesOf`, `stopOn`, `stopNow`, `placeLine`, `withStops` in `core/model.ts`): a trip can
  have several places with their own dates (fewer than two stops are dropped); Overview and Around have stop chips, each
  day's head names its place, offline keeps every stop's map.
- Bookings from files (`app/readFiles.ts`, `readBookingFile`): images by on-device OCR, PDFs by `pdfText`, `.ics` by
  `readIcs`, `.eml`/`.txt`/`.html` to `readConfirmation`; "A file or screenshot" on the booking form, the manifest's
  `share_target` (POST to `/poreia/share`, `takeShare` in its worker, then `?open=shared`) and `file_handlers`.
- Travel together (`core/tripSync.ts` `mergeTrip`, `app/sharedTrips.ts`, `components/Together.tsx`): a trip shared through
  `createSharedLists` (`poreia:sharedTrips`, cache `poreiaShared`, AD `poreia-list`, invite
  `/poreia/?open=join:ID#k=KEY&n=NAME`, read in `main.tsx`): every record of the trip (trip, bookings, plans, packing,
  spending, saved places) is one sealed item; against the fingerprints last seen (`poreiaShared.seen.<list>`) the side that
  changed wins, both changed: later `updatedAt`; a removal carries across. `useTripSharing` passes every 4 s when something
  changed and pulls every 20 s. `Trip.people` (names, `peopleOf`, `myName`), `paidBy` on spends and bookings, Who paid
  (`core/split.ts` `balances`, `settleUp`: even shares to the cent, fewest payments).
- Documents (`core/documents.ts`, collection `poreia:doc:`, `screens/DocumentsPage.tsx`, routes `documents`/`document`,
  `?open=documents`): never in a shared trip; photos in IndexedDB `poreia-files` (`app/docFiles.ts`, device only, removed
  after the undo window); `expiryFact` / `needsLook` (ends before the trip, or a passport under six months after it).
  Arriving (`core/arriving.ts`, `components/Arriving.tsx`): emergency numbers and plugs as tables, `adviceFor` the home
  government's entry advice (else IATA), tipping from the country's Wikivoyage section (`wikiSection`, `tippingIn`).
- Days that fit (`core/dayFit.ts`): `between` (walk at 80 m/min with a 1.3 detour up to 3 km, else distance apart),
  `openStretches` (2 h+ with nothing set, after a booking's end when known); each day's forecast (`useDayWeather` in
  `TripDays`, from the stop that day, within 16 days).
- Compass and Oikonomia (`app/goalsAndSaving.ts`, loaded on demand; `components/TripGoals.tsx`): the person's own links
  per trip in `poreia:links` (`TripLinks`: `goalId`, `envelopeId`, `saved`, `envelopeSeen`, `envelopeGone`), never in the
  shared trip record. GoalCard adds the trip as a GOAL and offers "Mark it reached" after it. With Oikonomia added, every trip
  still to come gets its own envelope when its page opens (`syncEnvelope` from `useEnvelopeSync` in TripPage: name, budget as
  target, start as date; money saved here before moves in as an entry); after that `core/envelopeSync.ts` `planEnvelopeSync`
  passes changes against the last seen state: trip name/budget/start to the envelope, envelope name/target back to the trip
  (never its dates); both changed, the trip wins. Money lives only in the envelope. Oikonomia's changes arrive through its
  store's `subscribe`, `onRemoteChanges` and coming into view (`watchEnvelopes`). An envelope deleted in Oikonomia or
  unlinked is let go (`envelopeGone`) and only made again by hand. Without Oikonomia, "Saved for it" stays here.
- Dates (`components/DateRange.tsx`): From and Until as two tiles with the native picker unseen over each, nights (or days for
  time off) between and Clear; used by Explore, the trip form and its stops, and time off. Poreia's labels carry no
  "(optional)" (the owner's choice). When to go (`core/climate.ts` `monthsOf`, `pastYear` in `world.ts`,
  `components/WhenToGo.tsx`): the past twelve whole months at the place as one range bar a month on one scale, a tap names
  the month, a dot marks the trip's months, a table beside; in Explore and on trips still to come. Explore's `PlaceHeader`:
  the place's picture (`PlaceScene`), hours apart and distance from home.
- Budget (tab `budget`, `?open=budget`, manifest shortcut; `screens/BudgetPage.tsx`): the year's travel budget (`settings.yearBudget`,
  set there), spent so far across the year's trips and what they still take (`yearSpending`, `budgetYears` in
  `core/yearBudget.ts`: each trip at its budget or its costs when more), a bar, each trip (opens its Money), totals by kind,
  Add spending with a trip picker and every spend of the year (`components/Spending.tsx` `SpendForm`, `SpendList`, shared
  with a trip's Money; added and deleted with undo). Wording kept short: empty states name the thing, no explanation lines.
- References (never on the Trips page): `settings.yearBudget` (the year's travel budget, set on Budget;
  in Poreia's currency when set) and the time off balance. `components/References.tsx`: `YearBudgetLine` (`core/yearBudget.ts`
  `yearTrips`: trips starting that year, each at its budget or its costs so far when more, converted by `ratesInto`) under
  the trip form's Budget and on Money; `TimeOffLine` (hours the dates take by `countHours`, what `leftAfter` leaves) under
  the trip form's dates and in Explore. Hours (`hoursFor`): each whole week (seven days from the first) is a full week off
  (`fullWeekHours`: `weekHours`, else the usual day times the work days, five when none), other days from shifts or the
  usual day; public holidays at home take nothing (`publicHolidays` in `world.ts`: Nager.Date, global and Public only, home's
  country else the phone's region; `HolidaysLine` names them). Where a trip stands is read, not chosen (`stageOf`: a stay or
  a way there booked, dates, or neither; `Trip.stage` kept for older records). Travelers follow `Trip.people` once there are
  two names. The Time off page lists the year's trips with their time off and budgets (`TripsThisYear`). Amounts typed anywhere are read by `core/money/readAmount.ts` (shared with Oikonomia's
  `moneyInputCents`: "3,500" and "3.500,00").
- Find and book (`BookLinks` in `components/Destination.tsx`, `searchLinks` in `core/links.ts`): kinds include Ferries; each
  site has a line on what it is for (`SITE_ABOUT`); a site whose search address is not known opens at its front page
  (`front: true`, "Opens the site"), others open filled. Airport codes come from OpenStreetMap (`core/airports.ts`
  `pickAirport`: IATA aerodromes within 90 km, international first, no military or private; `airportFor` in `world.ts`,
  kept 180 days), so Kayak, Skyscanner, Momondo and Kayak cars open with airports, dates and travelers. Trains and buses
  pick North American or other sites by the destination's country. The card lists From, To, When and Travelers.
- Forwarding address (migration `20261027000000_trip_inbox.sql`, Email Routing catch-all to the Worker's `email` handler,
  `worker/tripMail.ts`: `tokenFrom` reads `trips.<token>@`, postal-mime parses, `mailWords` keeps subject, sender, words and
  JSON-LD, sealed by `sealForInbox(..., 'poreia-mail')` through RPCs `trip_inbox_key`/`trip_inbox_add`; at most 100 waiting).
  The device (`app/mailInbox.ts`, key and lower-case base32 token in `poreiaMail`, device only) opens them in `useMailOpener`
  (start, sync ready, coming into view): `core/mail.ts` `readMail` (JSON-LD, subject, words), `tripFor` (the one trip whose
  dates hold the booking's day; with no date, the one trip still to come named in it), `alreadyThere`, `bookingFrom` (one
  undo for all added); the rest wait on Trips under From your email (collection `poreia:mail:`: add to a trip, new trip
  from it, remove with undo). More has Forward booking emails (Copy, New address, Turn off).
- Flight status (`worker/flightStatus.ts`, AeroDataBox via RapidAPI, secret `AERODATABOX_KEY`, `/api/travel/flight`, edge 5 min;
  `core/flights.ts` `flightNumberOf`, `statusWords`, `minutesLate`, `changes`; `components/FlightNow.tsx`): flights today or
  tomorrow show on the trip and booking page, looked at every 5 min while in view; a change (delay, gate, terminal,
  belt, boarding, canceled) shows as a notice through `notifications.showNow` while Poreia is open. Leave for the airport
  (`tripNotices` `poreia:go:`): flight time less `atAirport` (default 120 min) and `toAirport.minutes`, for flights from
  home's airport (`toAirport.code`, else a trip's first-day flight); More works the drive out (`airportFor` + `driveMinutes`:
  OSRM's public router, else distance at 50 km/h + 10 min). Packing for the weather (`weatherOffers`, `offersLeft` in
  `core/packing.ts`, `components/WeatherPacking.tsx`): rain, cold, heat, swings and snow from the forecast within 15 days, else
  last year, each with why; one tap adds, "Not for this trip" sets aside (`poreiaPackAside.<trip>`, device only).
- Places been and Your year (`core/year.ts` `placesBeen`, `countriesBeen`, `poreiaYear`; `screens/BeenPage.tsx`, routes `been`
  and `year`, `?open=been|year`): a map of every place from trips begun (`MapView fit`), countries with their places, and the
  family YearPage. Route (`components/RouteCard.tsx`): a trip's stops numbered on a map with a dashed line (`MapView line`), each
  leg's distance and, under 1,200 km, its drive. `components/PlaceExtras.tsx`: phrases (`core/phrases.ts` `readPhrases` from
  Wikivoyage's "<Language> phrasebook", everyday first, kept 90 days, not when home speaks it), home's embassies and consulates
  (`core/embassy.ts`, Wikidata SPARQL, P297 codes, diplomatic missions Q7843791), and Convert on Money (the country's currency
  to Poreia's, Frankfurter). Loyalty numbers are Documents of kind `loyalty`; `loyaltyFor` shows them on a booking whose
  provider shares a word with the program. Google details (`worker/placeDetails.ts`, Places API (New) Text Search with a field
  mask, secret `GOOGLE_PLACES_KEY`, photos as `photoUri` so the key stays on the Worker, edge a day; `components/GoogleDetails.tsx`
  on PlacePage, device cache a week): rating, reviews count, price, open now, hours, photos with authors, three reviews.
- Look: a trip's places are `.poreia-tabs` (six icon-and-label columns, a lit pill sliding by `--at`, sticky under the
  top bar at `--ll-safe-top` + 54px); empty places use `RouteEmpty` (`components/RouteEmpty.tsx`: the family `Empty` with a
  dashed route ring and a dot turning around the lit mark, still under reduced motion); bookings show `KIND_GLYPH`
  (Lamplight glyphs `car`, `train`, `bus`, `ship`, `ticket`, `pin` added for them).
- Trip pictures (`core/scene.ts`, `components/TripScene.tsx`): drawn in the browser in the family's scene style (sky, the one
  light at LAMP_X with its ring, ridges): `sceneKindFor` from the place's `elevation` and `population` (kept from Open-Meteo's
  place search; `elevationAt` asks once for older places): snow, mountains, city skyline, coast, tropics (palms), hills;
  `sceneTimeAt(hourAt(timezone))` lights it as dawn, day, dusk or night at the place. `TripScene` sits across the top of a
  trip's page (`.poreia-scene`, a `PICTURE` for the top bar, so its back link and name stay light); `SceneTile` is the
  trip's tile in lists. A trip under way opens on Today (`TodayCard`: the day, its sky, entries, Add a plan, Around me /
  Spending / All days) with the rest under "More about this trip".
- Places without a map point (typed, not picked) are looked up (`app/locate.ts`: `useLocatedTrip` writes the first match's
  facts onto the trip, keeping its name; `useLocatedPlace` for Explore); `PlaceSearch` takes the first match on leaving the field.
- Spacing: every block in a trip tab, a fold or a page follows the family gap (`.vt-panel > * + *`); sideways chip rows fade
  at their ends.
- Links: `?open=trip:ID|add|booking:TRIP|booked:BOOKING|plan:PLAN|join:LIST|documents|shared|explore|time|more`.
