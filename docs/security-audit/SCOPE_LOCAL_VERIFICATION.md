# Verifying Supabase's sign-out scopes on a real test project

Why: Stage 1 relies on `signOut({ scope: 'local' })` ending only this browser's session and `signOut({ scope: 'global' })` ending every session of the account. The unit tests prove which request the app sends. They cannot prove what Supabase does with it. This procedure confirms that on a real project, before Stage 1 is merged or relied on.

**Nothing here touches production.** Use a separate throwaway Supabase project and a throwaway account. The script refuses the production project and refuses to run without `ALLOW_TEST_PROJECT=yes`.

## What it checks

| # | Check | Expected |
| --- | --- | --- |
| 1 | Two password sign-ins are two sessions (different `session_id`) | pass |
| 2 | `signOut({ scope: 'local' })` on device A returns no error | pass |
| 3 | Device A: the auth server no longer accepts its access token | pass |
| 4 | Device A: its refresh token no longer works | pass |
| 5 | **Device B: its access token is still accepted** | pass: another device was not signed out |
| 6 | **Device B: its refresh token still works** | pass |
| 7 | `signOut({ scope: 'global' })` on a third device, then device C and device B: access tokens refused, refresh tokens refused | pass |
| note | Whether the data API still accepts device A's old access token | informational, see below |

Checks 5 and 6 are the ones Stage 1 depends on: signing out of this device must not sign out another device.

## Steps

1. **Create a test project** in Supabase (free plan is enough) that is not the production project. For the data-API note to be meaningful it should have the app's tables (`docs/SERVER_SETUP.md`, the migrations in order); without them the note reports a 404 and the checks still run.
2. **Create a test user** with an email and password (Authentication > Users > Add user; confirm the email so password sign-in works). Use an address that belongs to no real person.
3. **Collect** the project URL, its anon (publishable) key, and the test user's email and password. Do not use the service-role key; the script does not need it. Keep these out of the repository and out of chat.
4. **Run** from the repository root (Node 22, dependencies installed):

   ```
   SUPABASE_URL=https://<test-ref>.supabase.co \
   SUPABASE_ANON_KEY=<anon key> \
   TEST_EMAIL=<test user email> \
   TEST_PASSWORD=<test user password> \
   ALLOW_TEST_PROJECT=yes \
   node scripts/session-check/scope-check.mjs
   ```
5. **Read the result.** Every line starts with `pass`, `FAIL` or `note`; the last line says how many passed, and the exit code is 0 only when all did.
6. **Report back** the full output (it contains no keys or tokens), and the Supabase project's Auth settings that bear on it: whether "Single session per user" or "Time-box user sessions" or "Inactivity timeout" are on (Authentication > Sessions; some are plan-dependent), since they change how many sessions can exist.
7. **Tidy.** Delete the test user, and the project if it was only for this.

## Reading the results

- **All pass.** `scope: 'local'` behaves as Stage 1 assumes. The PR can go forward on this point.
- **Check 5 or 6 fails.** Local sign-out is ending other devices' sessions too (or the project is configured to allow one session per user). Stage 1's "Sign out of this device" would then act as "everywhere". Do not merge until the cause is understood; the choice is then to rename the action, or to find the setting responsible.
- **Checks 3 or 4 fail.** The server does not end the signed-out session. The app still drops its own copy, but the session would stay valid on the server; that changes what "signed out" means and needs a rethink.
- **The data-API note.** Supabase access tokens are signed tokens. The data API may keep accepting a signed-out session's access token until it expires (default one hour), even though the auth server and the refresh token no longer work. If the note reports that, it is Supabase's documented design, not a defect of the app, and it is the reason a sign-out cannot instantly end access for a copy of the token. It bounds the exposure after a sign-out elsewhere to the token's remaining life, and a shorter token lifetime (Authentication > Sessions > JWT expiry) narrows it. The architecture does not rely on instant server-side revocation: what protects data on a signed-out device is that its key is gone and (from Stage 3) its records are sealed.

## What this does not cover

The app's own handling (covered by the unit and browser tests), what an installed iPhone app does, and Supabase behavior under outages. The failed-sign-out path, where the server cannot be reached, is tested in the app: the device signs out, and the screen says which sessions are still active.
