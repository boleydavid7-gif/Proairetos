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
- Generated copies (the worker block in `public/sw.js`, the edge function's `_shared/apps.ts`,
  `manifest.generated.json`) come from the manifest and are kept equal by tests. They arrive in Wave 2.

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
2. Display facts and generated copies.
3. Scripts (speed, layout, visual, alone checks, front pages).

## Current warnings

Mneme has no PNG icons, screenshots or front page; Meletē has no maskable icon or front page; Hydros has no front
page; several apps have more screenshots on disk than the manifest counts; most apps have no `declares` yet.
