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
| 3 | Home through providers (Slice 3); seven stray check screenshots removed | #114 | `c09f349b7695d6404c01686926979657350fa8e1` (head `d7f6937c`) | `sw.js` stamp 20261106135655 |
| 4 | Calendar through providers (Slice 4) and the feed's three new categories, all off; the #109 feed protections untouched | #115 | `3cde95d9056e2027d84648653227bc2c62c459da` (head `7aa80b9e`) | `sw.js` stamp 20261106141425 |
| 5A | Notice providers (11 apps), the provider path as the default, and key migration K0 | #117 | `de6006bf3faf5ea6d3dda6f25eecec450d48e5ff` (head `e1cd4392`) | `sw.js` stamp 20261106143519, live 2026-11-06 14:35 UTC |

**Release 2 verification on record:** GitHub `checks` green on the PR head and on `main` (run 1221); Cloudflare Workers Builds succeeded on the merge commit at 13:44:51 UTC; 24 of 25 routes answered 200 (the app, all 15 add-on apps, welcome pages, Lamplight, sitemap, manifest, `/api/store`, `/api/speculation-rules`) and `/privacy.html` redirects 307 to `/privacy`; the live `SearchSheet` chunk carries the `provider-derive` marks. No migration, Edge Function deploy or new Cloudflare variable. Rollback: `git revert -m 1 2ee57f7d`.

**Outstanding verification for Release 2 (not done):** a browser check of universal search on production (a typed word finds a record from at least three added apps; an app not added is not found; Hydros stays off until turned on in What's included); the family `together` check, which times out in this environment on `main` as well; a check on a real device.

**Release 3 verification on record:** `checks` green on the PR head (run 1223); Cloudflare Workers Builds succeeded on the merge commit at 13:57:12 UTC; the full suite passed (270 files, 1592 tests) in UTC and Los Angeles before the merge. On production, `scripts/home-check/check.mjs` at 390 (dark and light) and 1440 (dark) gives text, markup and pictures identical to the verified release build, with no page errors; `scripts/home-check/behaviors.mjs` passes 10 of 10 (every app derives once, a mark with the arrow key and undo, an app set aside in Apps on Today and a removed app both gone and not derived, records made and removed in another tab, only the changed app derives again, 293 ms to DOMContentLoaded). A browser check at 390 and 1440 confirmed that apps not added are absent from both groups, that Apps on Today's switch hides and restores an app, and that Edit Today turns a section off. One visible change from before Release 3 is on record: Therapeia's dose lines no longer show the dose amount (the owner's decision). Rollback has no run-time switch: `git revert -m 1 c09f349b`; nothing stored changes.

**Outstanding for Release 3:** a check on a real device; the family `together` check (times out in this environment on `main` too).

**Release 4 verification on record:** `checks` green on the PR head (run 1227) and on `main`; Cloudflare Workers Builds succeeded on the merge commit at 14:14:40 UTC; before the merge the full suite passed (276 files, 1679 tests) in UTC and Los Angeles. The migration, the `calendar-feed` function, `supabase/`, `worker/`, `wrangler.jsonc`, `public/sw.js`, `src/data/sync/supabase.ts` (`FEED_FORMAT = 2`) and the three #109 feed tests are byte-identical to the pre-merge `main`; no migration was added. On production, 19 routes answered 200 (the app, the 15 add-on apps, `/welcome/`, `/lamplight/`, `/api/store`); `scripts/calendar-check/behaviors.mjs` passed 12 of 12 and `presentation.mjs` 21 of 21 at 390 and at 1440 px (every app-owned entry opens its record and has no Delete; an imported calendar's events are not links and keep Delete with Undo); Settings > Calendar shows the commitments switch on and the other six off for a new profile, and the three new switches off for a stored choice that predates them.

**What the feed may hold (owner's decisions):** with a category switched on, bill names and due dates; trip names, dates and the trip's own place name, and days of time off; titles and times of bookings and plans that have a time. It never holds a confirmation code, address, note, description, route or financial amount. The file stays format 2. Anyone with the link can read it, so the settings page and `public/privacy.html` say what it holds.

**Outstanding for Release 4:** a real subscription in a calendar application. An HTTP 200 from the feed is not proof the feed works: subscribe Apple Calendar, Google Calendar or Outlook to a link with each new category on in turn, and check the events, the trip's place name, that nothing else appears, and that turning a category off removes its events on the next refresh. Also a check on a real device. Until then the feed's behavior in a calendar application is unverified.

**Release 5A verification on record:** the first CI run on the PR failed because CI also runs the suite in Pacific/Auckland and the notice baselines had no file for that zone; the fix (two baselines recorded from the legacy functions at the commits where the others were taken, which reproduce the committed UTC files byte for byte) passed, and `checks` is green on the PR head and on `main`. Cloudflare Workers Builds succeeded on the merge commit at 14:35:34 UTC. On production: the live `sw.js` equals a local build of the release apart from the stamp and has `wasShown`; 19 routes answered 200; `scripts/notices-check/check.mjs` passed 10 of 10 (the providers and the apps' own functions give the same 70 notices at the same times; with details on and private no code, address, departure place, dose, note or amount is in a notice's words; the dose is only in its key). Before merging: notice, provider, Therapeia, apps and language tests 395 of 395 in UTC and Los Angeles, and the whole suite in Pacific/Auckland 1735 of 1735. Notice wording is shorter on both paths (no bill amount, no trip confirmation code, address or departure place, no dose amount, a visit without names says only that it is a visit); rolling the path back to the apps' own functions does not bring the old words back.

**Release 5B waiting period.** 5A went live on **2026-11-06 at 14:35 UTC**. K1 must not start before **2026-11-13 14:35 UTC**, and then only when: the owner's active devices have loaded the update; no K0-era worker still controls an active page; the K0 compatibility tests pass; and no unexpected duplicate or missing notification has been seen. Seven days does not guarantee that a dormant device has updated; such a device can show one notice a second time after K1, and the app keeps no record of device builds. K0 compatibility stays in place throughout. K1 (`8326e6d1`, with the record `421f833d`) is not deployed, so K2's 21-day countdown has not started.

**Outstanding for 5A:** delivery of a real push to a real device with reminders set up (closed app); a check on a real device that a notice appears once and a cleared one stays cleared; the family `together` check.

**Not on `main` yet, in order:** Release 5B (K1, not before 2026-11-13), Release 6 Library (switch OFF by default), then Commit 8, K2 and Hydros notices as in section 3. Release 5B starts only when the owner authorizes it.

**Separate workstream, not started:** Unified Session Security & Local Data Protection (section 0a). Its first task is a read-only audit.

**Still true:** the Lab page and the diagnostic pages exist only on the development branch. Before that branch is merged with `main`, they must be handled explicitly (kept off `main` by a revert commit or removed from the branch), never by a silent conflict resolution.


## 0a. Separate workstream: Unified Session Security & Local Data Protection

Added 2026-11-06 at the owner's request. It is **not** part of Release 5B or Release 6 and has its own plan, tests and pull requests. Nothing is implemented. The first task is a read-only audit; implementation waits until the audit has explained exactly why signing out can leave private information reachable and the owner has approved a plan.

**Concern.** After a person signs out, private information may still be reachable on the device. The audit has to find where and why, not assume.

**Status (2026-11-06).** Audit finished (`docs/security-audit/SESSION_SECURITY_AUDIT.md`, merged in #120). Architecture proposal merged and simplified to four stages (`SECURITY_ARCHITECTURE_PROPOSAL.md`; the owner's conditions: Argon2id evaluated before the encryption format is final, the key-wrapping design reviewed before implementation, plaintext never removed until its sealed copy is verified and recoverable). **Stage 1 is built and ready for release as PR #121 (branch `security/stage1-session`), awaiting the owner's approval; it is not merged or deployed.** Its release procedure and rollback are in `docs/security-audit/STAGE1_RELEASE.md`. Stage 2 (encryption foundation), Stage 3 (sealing the records) and Stage 4 (ecosystem integration) are not started.

**Remaining security risks.** (1) Signing out does not yet protect the local records; they stay readable until Stage 3. (2) An access token already issued keeps working on the data API after sign-out until it expires (measured on a real project: one hour). (3) A sign-out the server could not reach leaves that session live on the server. (4) The sign-out scopes were verified on one disposable project; real devices, an installed iPhone app and Safari were not tested. (5) "Sign out" now ends this device only. (6) The published calendar link stays on after sign-out.

**Audit scope**

| Area | What the audit covers |
| --- | --- |
| Browser storage | localStorage, sessionStorage, IndexedDB (including the per-app and device-only stores) and Cache Storage: what is there after sign-out, what is sealed, what is readable |
| Service workers | cached pages, the on-device notice cache and the words kept for notifications, the data key kept for opening sealed pushes, and what a worker can do in the background after sign-out |
| Authentication | session revocation, refresh tokens, the sign-in pass between apps, passkeys, and what sign-out actually does on the server and on the device |
| Encryption | passphrases, the data key and its exportable copies, key derivation, recovery keys, and where each is held and for how long |
| Memory | decrypted records, application state, caches and open companion apps after sign-out |
| Cross-app behavior | signing out of Proairetos must lock every companion app, including the ones that keep their own storage |
| Multiple tabs | signing out in one tab must lock every other tab and window at once |

**Expected outcome (the standard the audit measures against).** Signing out makes private information inaccessible immediately; clears decrypted data and encryption keys from memory; stops another person reopening private screens; preserves encrypted offline data where appropriate; and requires authentication and unlocking before data becomes accessible again.

**Constraint (the owner's).** Local databases are never deleted automatically. The aim is to protect the information, not to destroy someone's offline records. A person's own explicit choice to delete (Delete account, a device wipe they ask for) is separate and unchanged. Existing rules still hold: a different account on the same device already has the previous account's data put away (`changeDeviceAccount`), the optional Reflect lock is privacy on a shared device and not encryption, and the passphrase unlocks the data.

**Order of work**
1. Read-only audit with a written finding for each scope row: what is reachable after sign-out, why, how it was found, and how serious. No code changes.
2. A plan for the owner to approve, with each change separately reviewable and a rollback for each.
3. Implementation as separate releases, each verified in a real browser across tabs and companion apps, and on real devices.

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
