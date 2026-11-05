# Application registry

One manifest describes every app in the family: `src/core/apps/manifest.ts` (pure data, imports nothing).
It is the authority for an app's id, name, status, address, install facts, backup prefix, reminder source and
kinds, notice switches, Today parts, search class and the statements it makes about what it reads and writes.

## Rules

- Design data (palettes, identity, marks) stays in Lamplight. The manifest does not replace it.
- `declares` (reads, writes) is a statement for people and tests. It is not security enforcement.
- Visible order is stored explicitly (`today.order`, `notices.page`), so moving to the manifest changes nothing seen.
- Retired apps stay listed (`status: 'retired'`, `aliasOf`). Praxis is an alias of Theoria; its records, links
  and worker choice are kept.
- Search classes: `private`, `own-search` (a minimal encrypted projection may sync for the person's own search),
  `shared` (explicitly authorized). Oikonomia and Hydros carry their allowed and excluded fields.
- Generated copies come from the manifest (`npm run apps:build`) and tests fail while any is out of date:
  `src/core/apps/registry.generated.json`, the marked block in `public/sw.js` and the marked block in
  `supabase/functions/send-reminders/index.ts` (inline, as the Deno function deploys as one file). The shape is
  `runtimeRegistry()` in `src/core/apps/runtime.ts`.

## Checks

- `npm run apps:check` validates the manifest and the files on disk. Errors (missing page, web manifest,
  icon, own worker, or the notification icon of an app with reminders; wrong scope or start URL; duplicate claims)
  exit 1. Warnings (more icon sizes, screenshots, shortcuts, front page, coverage in the speed, layout, visual and
  alone checks, a missing `declares`) are listed and never fail.
- `src/tests/apps/` holds the structure tests, the asset tests and the parity tests against the lists still
  written by hand.

## Adding an app

Add one entry to `APPS`. The validator then names what is missing. Until a wave migrates a consumer, that
consumer's own list still needs the id (the parity test says which).

## Migration waves

0. Manifest, validator, parity tests (this commit). Nothing reads the manifest yet.
1. Plain id lists read it: `added.ts`, `purchases.ts`, `data/backup/family.ts`, `data/sync/supabase.ts`,
   `vite.config.ts`, `core/notify/sources.ts`, `core/today/apps.ts`, `useTodayParts.ts`.
2. Display facts and generated copies (done): `familyApps` (retired apps are left out), `appDetails`, the notice
   switches in Settings > Notifications, `placeFor`, the worker's waitlist and prefetch lists read the manifest;
   the worker and the reminder function read the generated copies. Snapshot tests hold names, lines, colors,
   icons and Store details to what they were.
   The four notification inconsistencies found here are listed under Known issues; none is changed.
3. Scripts (done): the speed, layout, visual, smoke and alone checks take their apps from `surfaces.<check>`; the
   alone check takes names from the manifest; `scripts/welcome/build.mjs` takes each page's name, address, icon,
   colors, line and description from the manifest and keeps only the page's own words (category, card, points). It
   stops on a page for an app that is not in the manifest or is retired, and lists active apps without a page.
   The pages it writes are byte-identical to before. Adding an app to the manifest is enough for every check; its
   front page also needs one entry of its own words in `build.mjs`. Special handling stays where it was
   (Proairetos at the root in the speed and layout checks, its own page colors, Poreia's page ink, the dock
   selectors, the seeded settings in the smoke check).

## Current warnings

Mneme has no PNG icons, screenshots or front page; Meletē has no maskable icon or front page; Hydros has no front
page; several apps have more screenshots on disk than the manifest counts; most apps have no `declares` yet.

## Known issues for later review

Found while moving the notification lists into the manifest. Each is preserved exactly as it behaved, and none is
a decision that it should stay. (Wave 2's report said three; there are four.) Review each with the owner before
anything changes.

1. **Mneme's notice windows.** Mneme is not among the apps whose open windows are told apart from Proairetos when a
   notice is tapped (`surfaces.noticeWindow` is false). A Mneme window may count as a Proairetos window. Mneme has no
   reminder source today, so nothing reaches it yet; this matters if it gets one.
2. **Two names for the retired app.** The service worker names Praxis's notices "Theoria" (their reading blocks
   live there); an iPhone's own push names the same source "Praxis" (`pushNames`).
3. **Hydros has no tap rule.** `placeFor` has no case for a Hydros notice, so a tap goes through Proairetos
   (`/?open=hydros`) instead of opening `/hydros/` directly. The service worker and `core/notify/place.ts` agree.
4. **Poreia's push icon.** An iPhone's own push for Poreia uses its drawn `/poreia/icon.svg`; every other app uses
   its `icons/icon-192.png` (`notices.pushIcon`). SVG icons in push notices are not reliably supported.

## Checks that still fail on purpose

`scripts/family-check/together.mjs`: 20 pass and 13 fail. The 13 fail before and after every wave (click-through steps
written before the Store and the Nov 5 changes to Today and the list pages). They are documented, not hidden, and are
repaired separately. Its only edit is the Store owner sign it now seeds.

## Outstanding baseline issues (not changed, not hidden)

These existed before Phase 2 and are unchanged by it.

- **Speed check.** Proairetos's first paint and largest paint measure about 1.5 to 1.8 s on the test machine against
  a 1.4 s budget. The build from before Phase 2 measures about 1.5 to 1.6 s there, so this is not caused by it. Every
  other app is within budget.
- **Smoke check** (`scripts/visual/smoke.mjs`). 56 of 60 viewport checks differ from `scripts/visual/baseline.json`
  (last updated Nov 3) in title position; no invariant (overflow, clipped title, unnamed button, one root) is
  broken. The baseline needs a deliberate refresh. The script also has paths for another machine (`/usr/bin/chromium`,
  `/opt/codex/...`, port 4192); it ran only through overrides.
- **Together check:** 20 pass, 13 fail, the same before and after every wave (steps written before the Store and the
  Nov 5 changes).

## Providers (Phase 3, Slice 1)

`provides` lists the capabilities an app has a provider for (today `search` for eleven apps: Askesis, Soma, Oikonomia, Hydros, Poreia, Theoria, Philia, Ergon, Therapeia, Dynamis, Ktema). Every app, retired ones included, has a `search` entry; `private` means nothing is searched. `search` lists
the fields universal search may hold (`indexes`), the fields it never holds (`excludes`), an optional rolling
`windowDays` and `defaultOn: false` for an app that is off until the person turns it on. The validator ties `provides`
to a classified `search` entry; `src/tests/providers/` ties it to the registered provider modules and to what syncs.
See `docs/PROVIDER_CONTRACT.md`.
