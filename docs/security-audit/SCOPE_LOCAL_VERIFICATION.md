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

## Result of the first real run (2026-11-06)

Run against a disposable Supabase project and a throwaway user, with the script as committed (`scope-check.mjs`), from the repository root, `supabase-js` 2.117.2. No credentials are recorded here; the project is not production and holds none of the app's tables.

**Output: 12 of 12 passed.**

| Check | Result |
| --- | --- |
| Two sign-ins are two different sessions | pass |
| Both sessions accepted before any sign-out | pass |
| `signOut({ scope: 'local' })` on device A returns no error | pass |
| Device A: the auth server no longer accepts its access token | pass |
| Device A: its refresh token no longer works | pass |
| Device B: its access token is still accepted | pass |
| Device B: its refresh token still works | pass |
| A third device signs in; device B still signed in | pass |
| `signOut({ scope: 'global' })` on device C returns no error | pass |
| Device C: access token no longer accepted | pass |
| Device B: access token no longer accepted | pass |
| Device B: refresh token no longer works | pass |

**What this confirms.** `scope: 'local'` ends the session it is called from and no other: device B stayed signed in and could refresh. `scope: 'global'` ended every session. A refresh token from a signed-out session is refused, and the auth server refuses its access token (a request to `/auth/v1/user` with it returns 403).

**Settings that bear on session behavior.**
- Access token lifetime: **3600 seconds** (read from the token's `iat` and `exp`).
- Two simultaneous sessions for one user were allowed, so a single-session limit is not on.
- Public auth settings: email sign-in is the only method enabled, no external providers, anonymous users off, sign-up open, email confirmation required.
- Not readable from outside the dashboard and **not recorded**: "Time-box user sessions" and "Inactivity timeout" (Authentication > Sessions). Nothing in this run depended on them, but they were not seen.

**Not answered by this run.** Whether the data API keeps accepting a signed-out session's access token until it expires. The project has no tables, and the data API's root endpoint answered 401 for a valid token as well as a signed-out one, so it could not tell them apart (the script's note reported 404 for the same reason). To measure it, repeat the check against a table that a signed-in user can read (the app's migrations on the test project), or a small table made for the purpose. Until then the one-hour access-token lifetime is the upper bound that should be assumed for a copied token, which is the reason the design does not rely on instant revocation.

## Probe: does a signed-out access token still work on the data API?

The first run could not answer this (no tables). `scripts/session-check/token-after-signout.mjs` answers it against a table made for the purpose. It needs privileged access once, to create the table; the script itself uses only the publishable key and the test user.

**1. Create the table** (Supabase dashboard > SQL editor, on the disposable project only):

```sql
create table public.security_session_probe (
  id integer primary key,
  note text not null
);
alter table public.security_session_probe enable row level security;
revoke all on table public.security_session_probe from anon, authenticated;
grant select on table public.security_session_probe to authenticated;
create policy "authenticated users can read the probe"
  on public.security_session_probe for select to authenticated using (true);
insert into public.security_session_probe (id, note) values (1, 'harmless test row');
```

The anonymous role has no privilege and no policy. The signed-in role can read, and nothing else.

**2. Run** (environment variables only; the script prints status codes, row counts and seconds left, never a password or a token):

```
SUPABASE_URL=... SUPABASE_ANON_KEY=... TEST_EMAIL=... TEST_PASSWORD=... ALLOW_TEST_PROJECT=yes \
  node scripts/session-check/token-after-signout.mjs
```

It signs in two devices; confirms an anonymous read is refused and both devices read the row; signs device A out with `scope: 'local'`; then reads with A's original token and with B's token immediately and again after 5, 30 and 120 seconds (`DELAYS=5,30,120` changes this), and asks the auth server whether it still accepts A's token. It exits with 2 and signs both devices out if the table is missing or the first reads fail.

**3. Tidy** after the results are recorded:

```sql
drop table public.security_session_probe;
```
