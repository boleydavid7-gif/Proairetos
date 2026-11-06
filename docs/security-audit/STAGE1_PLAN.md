# Stage 1 plan: fix logout and session security

Status: **plan only; not authorized to build.** No encryption, no migration, no Edge Function, no server change. It follows `SECURITY_ARCHITECTURE_PROPOSAL.md`. Scope is what the audit found in F4 to F7 plus the two sign-out actions.

## Changes, by finding

| # | Change | Where | Audit finding |
| --- | --- | --- | --- |
| 1 | One function that drops every in-memory secret: `dataKey`, `passkeyKey`, `passkeyToFinish`, the pending account-password state and the sign-in pass state. Called from `signOut`, the revoked-device path and the signed-out branch of `resolvePhase` | `src/app/sync/syncController.ts` | F4 |
| 2 | When the session is gone with no user sign-out (a global sign-out elsewhere, a failed refresh, a dropped token), remove the stored key from `syncMeta` as well, after confirming it cannot interfere with sign-in returns (Google or Apple, the emailed code, the sign-in pass, passkey autofill), which read the session at start-up | `resolvePhase`, `localState().clear()` | F5 |
| 3 | A key-handling guard: `openWithAccount` also requires an account that is signed in, so a page whose session ended cannot open sealed bytes | `syncController.ts` | F4 |
| 4 | Two actions in Account: *Sign out of this device* (`signOut({ scope: 'local' })`) and *Sign out everywhere* (`'global'`, as today). Wording is short and plain; the destructive one says what it does | `AccountSection.tsx`, the family `AccountCard`, `supabase.ts` `signOutRemote(scope)` | decision 2 |
| 5 | A failed server sign-out is reported ("Signed out on this device. Reconnect to end the session everywhere.") and retried once the device is online and the session still exists; the pending retry is a device-only marker | `signOut`, a small retry in `startSync` | F6 |
| 6 | A revoked device or a failed refresh clears the key and shows signed-out, instead of staying in a half state | `handleDeviceRegistrationError`, the auth-state listener | F4, F5 |
| 7 | The calendar link shows whether it is active and has one place to turn it off; sign-out does not change it | `CalendarSection.tsx` | F7 |
| 8 | Other tabs and companion apps in the same profile: on the signed-out event they run the same clearing (change 1), so no page keeps a key | the `BroadcastChannel` handler and the auth listener | F4 |

## Tests (before any build)

- A regression test from the audit's harness: after a sign-out in one instance, the other can no longer open sealed bytes, and its key variables are cleared.
- A session ended elsewhere clears the stored key; the next sign-in asks for the passphrase or passkey. The return flows in change 2 are each tested so none is broken.
- Sign out with no connection: the local session is removed, the failure is reported and the server sign-out is retried and completed when online.
- `scope: 'local'` leaves another device's session working, and `'global'` ends it, against a real test project (not production), to confirm the Supabase behavior this plan relies on.
- Existing sync, passkey, handoff and device-account tests stay green in UTC, Los Angeles and Auckland.
- A browser run: two tabs and a companion app, sign out in one, check the others.

## Release and rollback

One pull request, no migration, no function, no variable. Revert the merge to roll back; nothing stored changes. Change 2 removes a key that the person can re-create by unlocking, and never touches records.

## What it does not do

It does not make records unreadable after sign-out (Stage 3), add a Locked screen (Stage 2), seal anything, revoke one chosen device, or change authentication methods.

## Approvals needed

The owner's go-ahead to build; later, the merge. No production step is involved.
