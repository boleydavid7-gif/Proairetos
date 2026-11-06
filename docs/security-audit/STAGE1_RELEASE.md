# Stage 1 release: deployment and rollback

Applies to PR #121 (Security Stage 1: sign-out and session end clear every key). **Do not merge or deploy without the owner's explicit approval.** This is an app-only change: no migration, no Edge Function, no new Cloudflare variable, no change to `worker/`, `wrangler.jsonc`, `public/` or `supabase/`.

## What ships
- Signing out, or a session that ends elsewhere, removes the data key, a passkey's key and the key copy kept for other apps from the page, other tabs and companion apps in the browser, and the database. Records are not touched.
- Account has **Sign out of this device** (this browser's session only) and **Sign out everywhere**. Until now both buttons did the global sign-out.
- A sign-out the server could not be reached for says so, for each case, and the message stays (on the device, until the next sign-in) and shows on the sign-in form.
- Signed out with the calendar link on, Settings > Calendar says the link is still on.
- What's new has one line about the two sign-out actions.

## Before approving the merge (all recorded on the PR)
| Check | Status |
| --- | --- |
| Typecheck, lint, `apps:check` | clean |
| Full suite in UTC, America/Los_Angeles, Pacific/Auckland | 285 files, 1751 of 1751 each |
| New regression tests fail on main's code and pass on the branch | 15 new tests |
| Real browser: two Proairetos tabs and a companion app; sign out of this device; keys gone, records kept | done (stub Supabase) |
| Real browser: server not reachable, both sign-outs: the right message, kept after a reload, shown in Settings > Account | done (stub Supabase) |
| Real Supabase project: `local` and `global` sign-out | 12 of 12 (`SCOPE_LOCAL_VERIFICATION.md`) |
| Real Supabase project: access token after sign-out on the data API | measured: **still accepted until it expires** (see risks) |
| Diff review: 17 files; no keys, tokens, passwords, project references, personal addresses; no dependency, config, worker, `supabase/` or `public/` file; no binary | done |
| GitHub `checks` on the exact final head | recorded on the PR |

## Deployment (after the owner approves)
1. Merge PR #121 with a **merge commit** (the method used for every release). Cloudflare builds and deploys `main` by itself.
2. Confirm main's `checks` run is green and Workers Builds succeeded on the merge commit.
3. Confirm the live `sw.js` build stamp changed to the deploy's time, and that the app, the 15 companion apps, `/welcome/`, `/lamplight/` and `/api/store` answer 200.
4. Confirm the shipped code is the release: the live Account chunk contains "Sign out of this device" and "Sign out everywhere", and What's new has the new line.
5. The owner signs in on two devices (or a device and a second browser) and checks: **Sign out of this device** on the first leaves the second signed in; **Sign out everywhere** signs both out; each asks for the passphrase or passkey on the next sign-in; the records are all still there. This is the one check that needs a real account.
6. Record the merge commit, the stamp and the date in `docs/PHASE3_HANDOFF.md` (section 0a).

A deployment replaces the build stamp of `sw.js`, as every deployment does; it does not change Release 5A's K0 observation period or the earliest start of Release 5B (2026-11-13 14:35 UTC).

## Rollback
1. Revert the merge commit: `git revert -m 1 <merge commit>` on a branch from `main`, open a pull request, wait for `checks`, merge. (No force-push, no reset.)
2. Verify as above (stamp changed, routes 200).
3. What the revert does and does not do:
   - Nothing stored needs repair. The removed keys are re-created by unlocking; no record was ever touched.
   - The old build has one **Sign out** that ends every device again, and does not show the failed-sign-out message.
   - A person who signed out while Stage 1 was live stays signed out. The sentence kept on the device (`proairetosSignOutNote`) is simply unused afterwards and is cleared the next time they sign in under a build that has this release.
   - Sessions ended by Stage 1 are not restored; people sign in again.

## Remaining risks (also in the handoff)
1. **Signing out does not yet protect the local records.** They stay readable by anyone who opens the app or reads the browser profile until Stage 3 seals them. Stage 1 is not complete protection and is not described as such anywhere.
2. **An access token already issued keeps working on the data API after sign-out** until it expires (one hour here), measured on a real project: the auth server and the refresh token refuse it at once, the data API does not. Synced records are sealed, so a stale token yields ciphertext; the server's plaintext (the published calendar file, device and reminder metadata) is readable with it for that time. Not run through to expiry. The design does not rely on instant revocation.
3. **A sign-out the server could not reach leaves that session live on the server** (the screen says so and says how to end it). A retry was not built because it needs the access token.
4. The two sign-out scopes were confirmed on **one** disposable project; "Time-box user sessions" and "Inactivity timeout" in the dashboard were not read. Real devices, an installed iPhone Home Screen app (each has its own storage and learns of a sign-out when it next reaches the server), and Safari were not tested.
5. **Behavior change:** "Sign out" used to end every device; it now ends this device. People who relied on the old meaning will find the other devices still signed in. The What's new line says so, and Sign out everywhere is under Devices & sessions.
6. The published calendar link stays on after sign-out by design; the settings page says so and signing in turns it off.

## Deployment record
Merged 2026-11-06 as `1bda13fd30f0b7018c451ff7ee8158361d41e416` (a merge commit; parents `a13994aa` and `31640337`). `checks` green on the merge commit; Workers Builds succeeded at 15:57:07 UTC; live `sw.js` stamp **20261106155652** (it was 20261106143519); the app, the 15 companion apps, `/welcome/`, `/lamplight/` and `/api/store` answered 200; the live Account chunk contains "Sign out of this device". Still open: step 5, the owner's two-device check with a real account. The remaining risks above are unchanged.
