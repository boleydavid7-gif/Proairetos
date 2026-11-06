# Phase 3 handoff: where to resume

> Updated 2026-11-06 after Releases 1 and 2 were merged and deployed. Section 0 is current. Sections 1 to 9 are the checkpoint as written at the usage limit and stay for reference; where they say Phase 3 is not on `main`, section 0 replaces them. The development branch `claude/optimistic-franklin-b5dehe` (HEAD `ce301810`) still holds everything not yet released and the Lab and diagnostic pages that `main` intentionally leaves out.

Written at a usage limit, as a preservation checkpoint. Nothing here was merged, deployed or migrated. Read this first after the limit resets.

## 0. Release status (current)

The release is selective and stacked: each release is its own branch from `main`, its own pull request, merged with a merge commit (not a squash, so later releases see earlier commits as ancestors), and verified in production before the next one starts.

| Release | Content | PR | Merge commit on `main` | Production |
| --- | --- | --- | --- | --- |
| Docs | Phase 3 plans, provider contract, handoff | #110 | `6cf6df83` | no code |
| 1 | Application manifest (Waves 0 to 3). The Lab page was removed entirely | #111 | `78673da96356c934b22da9ef7050dbe2d5e4e6fd` | `sw.js` stamp 20261106133651 |
| 2 | Provider core and universal search (Slices 1 and 2); diagnostic pages and their doc left out | #112 | `2ee57f7db4ad386d0a66956e177f9f956d820aae` (head `72fa6c11`) | `sw.js` stamp 20261106134438 |

**Release 2 verification on record:** GitHub `checks` green on the PR head and on `main` (run 1221); Cloudflare Workers Builds succeeded on the merge commit at 13:44:51 UTC; 24 of 25 routes answered 200 (the app, all 15 add-on apps, welcome pages, Lamplight, sitemap, manifest, `/api/store`, `/api/speculation-rules`) and `/privacy.html` redirects 307 to `/privacy`; the live `SearchSheet` chunk carries the `provider-derive` marks. No migration, Edge Function deploy or new Cloudflare variable. Rollback: `git revert -m 1 2ee57f7d`.

**Outstanding verification for Release 2 (not done):** a browser check of universal search on production (a typed word finds a record from at least three added apps; an app not added is not found; Hydros stays off until turned on in What's included); the family `together` check, which times out in this environment on `main` as well; a check on a real device.

**Not on `main` yet, in order:** Release 3 Home (Slice 3), Release 4 Calendar (reconcile with #109 and its tests `feedContent.test.ts` and `downloadsPrivacy.test.ts`), Release 5 notices with K0 and K1 (provider path default ON; deploying K1 starts K2's 21-day clock, to be recorded in `docs/PHASE3_SLICE5_KEY_MIGRATION.md`), Release 6 Library (switch OFF by default), then Commit 8, K2 and Hydros notices as in section 3.

**Still true:** the Lab page and the diagnostic pages exist only on the development branch. Before that branch is merged with `main`, they must be handled explicitly (kept off `main` by a revert commit or removed from the branch), never by a silent conflict resolution.


## 1. Repository state at the checkpoint

| Item | Value |
| --- | --- |
| Working branch | `claude/optimistic-franklin-b5dehe` |
| Branch HEAD before this checkpoint | `ec96148d357c315adcf9d495e9898fd5b9020141` (Slice 6, commit 3, group 3); the checkpoint adds one docs-only commit on top |
| Remote | Every completed and approved commit is pushed; 0 unpushed commits |
| `main` | `ccccb5db3602fc1d93d7e258db49be248e10fd53` ("Calendar feed privacy fix ... (#109)"); untouched |
| Merge base with main | `3a976709` (2026-11-05, "Layout check seeds Store ownership so Ergon shows its chore") |
| Branch vs main (fetched at the checkpoint) | 151 commits ahead, 60 behind; `git diff origin/main HEAD` is 291 files, +23,523 / -1,792 |
| Uncommitted work | Slice 6, Commit 4 (the Library page integration), **finished and tested but NOT approved, so NOT committed**. It is preserved as `docs/handoff/slice6-commit4-uncommitted.patch` (see section 4). The same changes are also still in the working tree if the container survives |

## 2. What is done (all on the branch, all pushed)

Earlier phases on this branch: manifest (Waves 0 to 3), universal search through providers (Slices 1, 2), Home through providers (Slice 3), Calendar through providers (Slice 4).

- **Calendar corrections and presentation:** privacy fix (#109 is its stand-alone version on main); presentation commit `f5822974` (app-owned entries open their record, no Delete on them, Due and Every year words).
- **Slice 5, notices through providers** (plan `docs/PHASE3_SLICE5_PLAN.md`): commits 0 `5bd97e01`, 1 `7ca90dd4`, 2 `1ae5c59e`, 3 `ffe2f193`, 4 `f451a2f6`, Therapeia dose refinement `45fe4acd`, 5 `ded9b9f3`, 6a baseline `48a44930`, 6 `a18b234c`, **7 `6927f0c4` (provider path is the DEFAULT; rollback is `proairetosNoticeProviders=off` on a device or `VITE_NOTICE_PROVIDERS=off` at build)**. 11 apps provide notices: Askesis, Diaita, Dynamis, Ergon, Ktema, Meletē, Oikonomia, Philia, Phyton, Poreia, Therapeia. Privacy decisions applied on both paths: no Oikonomia amount, no Poreia confirmation code, address or departure place, Therapeia visits follow the `names` choice, no dose amount. Meletē's switch works alone.
- **Notification key migration** (`docs/PHASE3_SLICE5_KEY_MIGRATION.md`): K0 `f322667d` (earlier keys, `also`), **K1 `8326e6d1`** (record-ID keys for Therapeia doses, Ktema, Ergon, Phyton). K1 is **not deployed, so the 21-day countdown has not started**. **K2 must not start** until the checklist in that document is complete.
- **Slice 6, Library through providers** (plan `docs/PHASE3_SLICE6_PLAN.md`): commit 0 baseline `4c637595`, 1 contract `9f94d3d2`, 2 store, hook and device switch `8454be1f` (switch default OFF), 3 group 1 `82378272` (Askesis, Dynamis, Soma), group 2 `a362fa31` (Theoria, Mneme), group 3 `ec96148d` (Poreia, Oikonomia). Seven providers declared and classified; `buildLifeRecords` takes a skip list.

## 3. What is outstanding

1. **Slice 6, Commit 4** (the page uses `useLibrarySource`): finished, not committed (section 4). Needs your approval to commit. One open item: an intermittent difference of up to 2 of 255 in 326 left-rail pixels between switch off and on at 1440 px in three runs, identical in the final run; cause not found. Decide whether to investigate or accept.
2. **Release to main** (nothing started beyond the audit in section 5).
3. **Commit 8** (remove the old notice gathering) and **Hydros** notices: not started; wait for the provider default to run in production.
4. **K2** (remove earlier keys): after K1 is deployed plus at least 21 days plus its checklist.
5. **Slice 6 later steps:** remove the old Library gathering after a period on the default; decide when to turn the Library switch ON.
6. **Health-data integration:** planned only (`docs/PHASE3_SLICE5_PLAN.md` section 14); not started.
7. Phase 4 and Phase 5: not started, not to be started before the release checkpoint.

## 4. Preserved uncommitted work: Slice 6, Commit 4

`docs/handoff/slice6-commit4-uncommitted.patch` holds the full diff (6 files). To restore the working tree after a reset:

```
git checkout claude/optimistic-franklin-b5dehe
git apply docs/handoff/slice6-commit4-uncommitted.patch
```

Files: `src/app/providers/library.ts` (adds `useLibrarySource`), `src/app/providers/libraryStore.ts` (`visible()` uses `orderLifeRecords`), `src/features/connections/ConnectionsPage.tsx` (uses `useLibrarySource`), `src/tests/life-records/libraryFixtures.ts` (`gatherInput`), new `src/tests/life-records/libraryIntegration.test.tsx`, new `scripts/library-check/check.mjs`.

Tests passed on it (not committed): `npx vitest run src/tests/life-records src/tests/providers/library.test.ts src/tests/providers/libraryStore.test.tsx src/tests/providers/provider.test.ts` in UTC and America/Los_Angeles, 9 files and 101 of 101 each; TypeScript and lint clean; `scripts/library-check/check.mjs` 14 of 14 against the Vite dev server (390 and 1440 px, switch off, on, apps removed). Remove the patch file in the commit that applies it.

## 5. Release audit findings (read-only, from this session)

- **Main holds no Phase 3 code.** Of main's 60 commits since the merge base, 54 are the same patches as commits on the branch (replayed copies), 5 are adapted versions of branch commits, and 1 is #109. So releasing means bringing all of Phase 3 (manifest, Slices 1 to 6, calendar corrections, notices default ON, K0 and K1) to main.
- **A tree merge of main into the branch has 37 conflicts** (`git merge-tree --write-tree origin/main HEAD` computes it without touching anything): CLAUDE.md, docs/SERVER_SETUP.md, public/privacy.html, public/sw.js, scripts/speed-check/check.mjs, scripts/welcome/build.mjs, src/app/family/{FamilyApps,added,appDetails,busyTime,purchases}.ts(x), useTodayParts.ts, src/app/sync/calendarFile.ts, whatsNew.ts, src/core/calendar/feedEvents.ts, src/core/notify/{notices,place,sources}.ts, src/core/today/apps.ts, src/data/backup/family.ts, src/data/storage/preferences.ts, src/data/sync/supabase.ts, DaysAheadPage, NowPage, SearchSheet, NotificationsSection, PrivacyGlance, TodayAppsOverview, several tests, send-reminders, the calendar migration, vite.config.ts, and a modify/delete. Method: merge `origin/main` INTO the branch (a merge commit, never a force-push), taking the branch's version where main has an older copy, and checking each against main's #109 content.
- **Main files missing on the branch:** `docs/CALENDAR_FEED_FIX.md`, `src/tests/calendar/feedContent.test.ts`, `src/tests/calendar/downloadsPrivacy.test.ts` (the stand-alone fix's own tests). Run them against the merged code; they are good regression tests for the branch's fuller calendar implementation.
- **Database:** no new migration on the branch. `20261111000000_calendar_feed_format.sql` exists on both sides with identical SQL (only comments differ); keep main's file, which is the one already run in production. `20261002000000` and `20261111000000` were run by the owner on project `ccxkwfmybtouneurxunj`.
- **Edge Functions:** `calendar-feed` is identical on both sides. `send-reminders` differs (the branch reads app names and icons from a generated registry, same output); redeploy is optional and needs explicit approval.
- **Worker and build:** `worker/speculation.ts`, `worker/waitlist.ts`, `vite.config.ts` read the manifest instead of hand lists (same output, to be confirmed by a build); `package.json` adds 7 check scripts, no dependency changes; `public/sw.js` has K0's `wasShown` (the build stamps it).
- **Switches in the release:** notices through providers ON by default (rollback above); Library switch OFF by default; K1 keys active once deployed.
- **Never run on this branch:** the full suite (`npm run check`), a production build, `npx wrangler deploy --dry-run`, the family and together checks.

## 6. Test results on record (all targeted, none full-suite)

| Area | Last result |
| --- | --- |
| K1: notify folder and provider.test.ts, UTC and Los Angeles | 14 files, 95 of 95; real-page notices check 18 of 18 |
| K0 verification | 14 files, 88 of 88 in both zones |
| Slice 6 groups 1 to 3 | 8 files, 88 of 88 in both zones |
| Slice 6 Commit 4 (uncommitted) | 9 files, 101 of 101 in both zones; library-check 14 of 14 |
| TypeScript and lint | clean at each commit |

## 7. Deployment requirements (when a release is authorized)

1. No database migration is needed for Phase 3 (do not run any SQL).
2. Edge Functions: none required; `send-reminders` optional and only with approval.
3. Cloudflare: pushes to main deploy the Worker with static assets; the build variables `VITE_NOTICE_PROVIDERS` and `VITE_LIBRARY_PROVIDERS` are not set (defaults apply). Workers Builds fails on non-main branch commits (a known, pre-existing branch-preview issue, not an app error).
3. Order if the calendar function ever needs redeploying: migrations, then the function, then the app (as in `docs/CALENDAR_DEPLOYMENT_CHECKLIST.md`).
4. Record the deployed commit hash and the K1 deploy date in `docs/PHASE3_SLICE5_KEY_MIGRATION.md` (line `K1 deployed: ______`); that date starts the 21 days.

## 8. How to resume (in this order)

1. `git fetch origin`; `git status`; confirm the branch and HEAD in section 1 (the next commit is this checkpoint).
2. Restore the Commit 4 working tree if it is gone (section 4), re-run the focused tests, and ask for approval to commit it as Slice 6, Commit 4. Resolve or accept the rail-pixel note first.
3. Release preparation, step by step, each with approval: audit conflicts with `git merge-tree`; merge `origin/main` into the branch locally; resolve the 37 conflicts; run the targeted Phase 3 tests, then `npm run check` once, then `npm run build` and `npx wrangler deploy --dry-run`; write the release summary; open a PR; wait for explicit approval to merge.
4. After a merge: verify main, the GitHub checks and the Cloudflare deployment, check the live app and that user data is intact, record the deploy commit, update the branch from main, restart K2's countdown from the real deploy date.

## 9. Standing rules (the owner's, still in force)

- No merge to main, deploy, production SQL or Edge Function deploy without explicit approval. Never force-push, reset or overwrite main. Never discard uncommitted work.
- Do not run tests, builds, browser checks or the full suite unless authorized; before asking, say which tests, why, and whether a smaller set is enough.
- Do not begin K2, Commit 8 or Phase 4 until authorized.
- Keep the writing standards of CLAUDE.md (a test scans every source file for the banned words, comments included).
- Do not spawn agents unless asked. Report each milestone: what changed, which apps, what was preserved, limits, tests run and not run, next step.
