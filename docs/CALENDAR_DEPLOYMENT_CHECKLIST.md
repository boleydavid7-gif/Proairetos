# Calendar feed correction: deployment checklist

Status: prepared, not executed. Every production step below waits for the owner's explicit confirmation at that step.
Nothing here has been run against production, and this session has no access to production.

## 1. What is being deployed, exactly

| Item | Value |
| --- | --- |
| Migration file | `supabase/migrations/20261111000000_calendar_feed_format.sql` |
| Migration last changed in commit | `e7cb7b72` (branch `claude/optimistic-franklin-b5dehe`) |
| Migration SHA-256 | `9cbfcddea05c4fd6ada7f50e93f9baacf54badf04da444ebbe59fe1c4cf7fadb` |
| Function | `calendar-feed` (`supabase/functions/calendar-feed/index.ts`), last changed in `729c5808` |
| Function SHA-256 | `d27cc96adf6bd6b2fe30dc136db4f7ae979389f095f38527ba972d283a1ee728` |
| Supabase project reference, from `wrangler.jsonc` (`SUPABASE_URL`) | `ccxkwfmybtouneurxunj` (`https://ccxkwfmybtouneurxunj.supabase.co`) |
| Function address | `https://ccxkwfmybtouneurxunj.supabase.co/functions/v1/calendar-feed` |

Before running anything, on the machine that will run it:

1. `sha256sum` the migration and the function from a checkout of the reviewed commit and compare with the table. If a hash differs, stop.
2. Confirm the project reference in the Supabase dashboard address (`supabase.com/dashboard/project/<ref>`) is `ccxkwfmybtouneurxunj`.
   The reference above comes from this repository's Worker configuration; this session cannot confirm that it is the production project.
3. `supabase link --project-ref ccxkwfmybtouneurxunj`, then `supabase projects list` to see which project is linked.

## 2. Things to know before choosing how to merge

- **The branch holds much more than this correction.** It is 124 commits ahead of `origin/main` and 59 behind. It carries the whole of Phase 3:
  the provider architecture, search, Home and Calendar through providers, plus these two corrections. Merging it deploys all of that.
- **The merge is not clean.** A trial merge (nothing applied) reports conflicts in 26 files, among them `CLAUDE.md`, `public/sw.js`,
  `scripts/welcome/build.mjs`, `src/app/family/added.ts`, `appDetails.ts`, `busyTime.ts`, `purchases.ts`, `useTodayParts.ts`, `DaysAheadPage.tsx`,
  `NowPage.tsx`, `TodayAppsOverview.tsx`, `src/data/sync/supabase.ts` and `supabase/functions/send-reminders/index.ts`.
  Main has changed `send-reminders` since the branch started, so merging main also means redeploying that function.
- **The privacy fix cannot be taken alone from this branch.** The feed now builds from the calendar providers (Slice 4).
- **Choose one:**
  - **A. Merge the whole branch.** Resolve the 26 conflicts, then run a release test plan (full suite in three time zones, build, wrangler dry run, the browser
    parity and behaviors checks, together-check, providers check) before deploying. This is the larger release.
  - **B. A small fix on its own branch from `origin/main`** (not on main): the feed stops adding bills and Poreia events, reads and writes format 2, and the
    settings text says what the file holds; plus the same migration and function. The three new switches arrive later with the full branch. Smaller, deployable sooner,
    and its own conflicts with the branch are small. Not started; it needs your decision.

## 3. Order, with a stop at each production step

Compatible with either choice. Each line is a separate confirmation.

0. **Record the counts** (read-only, SQL editor): `select count(*) as feeds, count(*) filter (where ics like '%Confirmation %') as with_codes, count(*) filter (where ics ~ '\$[0-9]') as with_amounts from public.calendar_feeds;` Keep the result.
   Note the backup and point-in-time-recovery retention shown in the dashboard (it bounds how long deleted rows can exist in backups).
1. **Run the migration.** Paste the exact file into the SQL editor. It is one transaction (`begin` ... `commit`); if the editor already wraps scripts, the inner `begin` only warns.
   It adds `format`, makes writes need `format = 2`, then deletes every row that is not format 2. Re-running is safe. This step ends every existing link.
2. **Deploy the function:** `supabase functions deploy calendar-feed --no-verify-jwt` (the flag is required: calendar apps cannot sign in; it is the same as before).
   Compatibility: same runtime and import as before (`Deno.serve`, `npm:@supabase/supabase-js@2`); the changes are one filter (`format = 2`) and one response header; no new variables or secrets.
3. **Release the app:** merge to `main` (route A or B). Cloudflare builds and deploys on push to `main`.
   Expectations: no new Worker variables, secrets or `wrangler.jsonc` changes in this correction; `public/privacy.html` and the app ship in the same build; the service worker picks up the new
   version on next open. Route A also needs `supabase functions deploy send-reminders --no-verify-jwt` for the changes already on main.
4. **Check** with a test account, never a real person's link:
   - an old token answers 404 (any 43-character token that was never made, or one noted before step 1);
   - in the new app, Settings > Calendar > Create link, subscribe, and the calendar shows only the categories switched on; the token in the link answers 200 with `text/calendar`;
   - a malformed token (`?token=short`) answers 404;
   - re-run the counts from step 0: feeds that are not format 2 must be 0, `with_codes` and `with_amounts` must be 0.
5. **Tell people:** What's new has the lines (links made before were ended; make a new link; remove the old subscription in the calendar app). Send anything beyond that yourself; the app sends no email about this.

## 4. Windows and what they mean

- After step 1 and before step 3, the app still on `main` is the old one: its attempts to create or refresh a link are refused by the database (an error line), and no file is written. Nothing is exposed.
- If the app is released before step 1 (a mistaken merge), its calls ask for a `format` column that does not exist and fail; old files stay served until step 1.
- If step 2 happens before step 1, every feed request answers "try again later" (the column does not exist). Nothing is exposed.

## 5. Rollback limitations

- Deleted rows cannot be restored from the app; there is no copy. Backups or point-in-time recovery may hold them until retention ends. Restoring one would bring old plain-text files back; do not.
- Rolling the function back is harmless after step 1 (no old rows remain).
- Rolling the app back leaves older apps refused by the `format = 2` rule. Removing that rule lets them write old content again; not advised.
- Nothing already fetched by a calendar app can be recalled; people remove the old subscription there.
- The link carries the token, and the platform's own request logs may record it. The app and the function log nothing of it; every old token is dead after step 1.

## 6. What has and has not been verified

Verified locally (see `docs/CALENDAR_CORRECTIONS_PLAN.md`, section 4): types, lint, recurrence and bills in three time zones, feed privacy and ICS, provider and time-zone tests, Poreia core, language guard,
the migration against a scratch Postgres 16 (20 of 20), the function's code against a stand-in client, the settings page.

Not verified: the function and migration on Supabase itself; a real calendar app subscribing; the merged build (route A) or the build from a fix branch (route B); the Worker build and `wrangler deploy --dry-run`
for either route; the full regression, browser and together suites on the merged code.
