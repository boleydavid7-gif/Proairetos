# Unified Session Security & Local Data Protection: audit findings

Date: 2026-11-06. Code audited: `main` at `e3e032d8` (Releases 1 to 5A deployed). Read-only: no application code, authentication or encryption behavior was changed, no local database or record was deleted, and nothing was done in production. Measurements ran against a scratch checkout with a test harness (attached as `signout-harness.test.ts.txt`; not part of the app).

## 1. The short answer

Signing out in Proairetos **ends the account session and forgets the data key. It does not protect the data on the device**, and that is how it was built (`syncController.signOut`: "Signs out and forgets the key on this device. Local data stays."). The app is local-first: records are stored **unencrypted** in IndexedDB and in browser storage, and the app opens and shows them with or without an account. Only the optional Reflect passcode gates any screen, and it is a screen gate, not encryption. So after a sign-out another person who opens the app sees the same Today, Reflect, medicines, trips and bills, and a person or program that reads the browser profile reads the same data.

That is the root cause of the concern, not a defect in the sign-out code. Meeting the owner's expected outcome (private information inaccessible immediately after logout; unlock required to get it back) needs a new capability: **protecting the local data with a key that sign-out removes**. Findings F4 to F7 are smaller, real gaps around it.

## 2. What was measured

Harness: the real `syncController`, the real `supabase-js` 2.117.2 client and the real device database, over fake IndexedDB and a stub network. A second instance of the controller stands in for another tab or companion app (same storage, own memory). Seeded: a signed-in session, a non-extractable data key, plaintext records, Strava tokens, a capture inbox key, a published calendar link.

| Measurement | Result |
| --- | --- |
| Sign-out in tab A: what the network saw | reminder rows deleted, then `POST /auth/v1/logout?scope=global` |
| Browser storage removed by sign-out | `proairetos.auth` (the session) and `proairetos.accountEmail` only |
| Database (IndexedDB) rows removed | `syncMeta` 3 → 0 (the data key, the sign-in-pass key, the sync time). Every record store unchanged (`lifeItems` 1 → 1) |
| Browser storage kept | the person's name, a medicine with its dose, Strava access and refresh tokens, the capture inbox token and private key, the calendar-link setting (enabled), the device key, the Store cache |
| Other tab (B), after sign-out in A | phase becomes signed-out within 400 ms, **but B still opens bytes sealed with the account key** (`openWithAccount`); it cannot seal new ones (`userId` is cleared) |
| Sign-out with no connection | local state cleared and the session removed from storage; **the server logout was never reached**; no message |
| Session ended elsewhere (global sign-out on another device, or a refresh that fails) | the session is removed, phase signed-out, **the data key stays in the database (`syncMeta` 1)** |
| Signing in again to the same account there | **phase `ready` with no passphrase or passkey asked for** |

## 3. Findings

Severity combines the harm if the finding is used with how easily it can be used. "Reach" says who can use it.

### F1. Local data is not protected by sign-out (High; by design)
- **What.** Every record store (the Proairetos IndexedDB, the browser-storage records of the other apps) is plaintext. After sign-out the app is fully usable and shows all of it. `changeDeviceAccount` already puts a *different* account's data away when another account signs in, but a plain sign-out, or no account at all, protects nothing.
- **Evidence.** Measured: record stores and personal keys unchanged by sign-out. Code: no encryption anywhere under `src/data/storage` (a search for `AES-GCM` and `crypto.subtle` finds none); `signOut` clears only sync state.
- **Reach.** Anyone who can open the app on that device or read its browser profile: a borrowed or shared device, a program with access to the profile, a person with the unlocked device. The operating system's own storage encryption protects a locked or powered-off device and nothing else.
- **Affected.** All 16 apps' records, Today, Reflect, Journal, medicines, bills, trips.

### F2. Plaintext copies and files outside the main stores (High; by design)
- **What.** Each is readable without the account and is not touched by sign-out: seven daily backup copies of everything (`proairetos-daily`, made with `exportFile()` and no password); the previous accounts' put-away backups (`proairetos-accounts`); the notice words kept for the service worker (Cache Storage `proairetos-notify`: names, and until K1 a dose in the key); Ktema files, Phyton and Philia photos, Theoria book files, attachments (device-only IndexedDB stores); the share inbox cache.
- **Evidence.** Code only (`dailyCopy.ts`, `deviceAccount.ts`, `sw.js`, the file stores). Not measured in a browser.
- **Reach.** As F1. It also means that protecting only the main stores would leave a full copy of the data beside them.

### F3. Service and third-party credentials survive sign-out (Medium)
- **What.** In browser storage, readable: Strava access and refresh tokens (`askesis:strava`); cloud-library tokens (`theoriaCloud.<provider>`); the capture inbox token and its private key (`proairetos.captureInbox`); the health inbox token and private key (`proairetosHealthKey`); the keys and invites of every shared list (`proairetosTogether`, `proairetosHousehold`, `somaShared`, `ergonShared`, `phytonShared`, `poreiaShared`, `ktemaShared`, ...); the Store entitlement cache.
- **Evidence.** Measured: the Strava tokens and the capture inbox key remained after sign-out. The others are from the code (their keys are not cleared by `signOut`).
- **Reach.** Whoever reads the profile can call Strava as the person, or read waiting captures and health data through the inbox calls, which need the token and key but no account session, until those are replaced. A shared-list key alone gives nothing without a session.

### F4. Another tab or companion app keeps the decrypted key in memory (Medium to Low; low exploitability)
- **What.** When the session ends in another tab, `resolvePhase`'s signed-out branch sets `userId = null` and the phase, but never clears `dataKey`, `passkeyKey`, `passkeyToFinish` or the pending password variables. Only the tab that performed `signOut()` clears them.
- **Evidence.** Measured: tab B reports signed-out and still opens sealed bytes.
- **Reach.** Needs code running in that tab (a malicious extension, an injected script, developer tools). The key is non-extractable, so it can be used but not copied out. The page shows "signed out" while it can still decrypt.
- **Affected.** Every app page that runs the sync controller (Proairetos and the companion apps share it).

### F5. A session ended elsewhere leaves the key on the device, and signing in again skips unlocking (Medium)
- **What.** The key is removed only when the person signs out on that device (or a revoked device is detected). If the session ends otherwise (a global sign-out from another device, a failed refresh, the server dropping the token), `resolvePhase` finds no user and leaves `syncMeta.dataKey` in place. Signing in to the same account on that device then goes straight to `ready`.
- **Evidence.** Measured: `syncMeta` 1 row after the session ended; phase `ready` after sign-in with no passphrase or passkey.
- **Reach.** The signer must still complete a sign-in (email code, password, passkey), so this is not an account bypass. It does mean the passphrase layer is skipped, and for installed apps on iPhone, where each Home Screen app keeps its own storage, **signing out of Proairetos leaves a key in every companion app's own storage**.

### F6. Sign-out with no connection does not revoke the session on the server, and says nothing (Medium to Low)
- **What.** `signOut` ignores failures (`signOutRemote().catch(() => undefined)`, the same for `disableReminders`). Offline, the device is cleaned and the session removed locally, but the refresh token stays valid on the server, the reminder rows and the push-subscription row are not removed, and no retry is queued. The person is told nothing.
- **Evidence.** Measured: server logout not reached; phase signed-out; no error. `supabase-js` 2.117.2 does remove the local session when the network call fails, so the local side is safe on this version (worth a test that pins it).
- **Note.** The remote call is `scope: 'global'`: signing out here signs out every device at once. That is deliberate (the function's comment) but unexpected for a person who meant one device; it is a decision to confirm, not a defect.

### F7. The published calendar link stays published after sign-out (Medium)
- **What.** `signOut` does not turn the calendar link off. The setting stays enabled locally and the file on the server stays served to anyone with the link, going stale. Only deleting the account disables it.
- **Evidence.** Measured: `proairetos.calendarFeed` still `enabled` after sign-out. Code: no calendar step in `signOut`. The server row was not queried.
- **Reach.** Whoever holds the link reads what the person chose to publish (since Release 4, up to bill names and trip places when those switches are on). The link is a secret and the person chose to publish it, so this is a judgment about what sign-out should do, not an exposure nobody agreed to.

### F8. The Reflect lock gates screens only (Low; documented)
- **What.** The passcode (PBKDF2, 150,000 rounds, stored in `proairetos.lock`) hides Reflect, Journal, Insights and the weekly review in the interface and locks after a minute. The reflections are plaintext in the database, and the lock is unrelated to sign-out.
- **Reach.** Anyone reading storage ignores it. The code and the guide already say it is not encryption.

### What works as intended (for the record)
- The session token is removed from storage on sign-out, also with no connection.
- The data key, the sign-in-pass key and the reminder marker are removed from the database; the in-memory key and pending password state are cleared in the signing-out tab.
- Reminder rows are deleted and the push subscription is unsubscribed when online; the worker can no longer open sealed pushes without the key.
- The key is non-extractable: it can be used while present but not exported.
- Another tab learns of the sign-out within a moment and shows signed-out.
- A different account signing in on the same device has the previous account's data put away.
- Sign-out never deletes records.

## 4. Why the expected outcome needs more than a fix to `signOut`

The expected outcome (nothing readable until authentication and unlocking; offline data kept, not deleted) means the local data must be **sealed at rest under a key that sign-out removes**, and unlocking must bring the key back from something the person holds (passphrase, recovery key, passkey), also offline. Two properties of the current design bear on that:
1. A non-extractable key kept in the database is usable by anyone who can open the app on that device. Protection therefore comes from **removing** the key at sign-out, not from hiding it.
2. Everything reads plaintext today: about thirty IndexedDB stores, every app's browser-storage records, the providers (`ctx.records` for search, Home, calendar, notices), the notice cache the worker reads, backups and copies. Sealing the primary stores touches all of them, and the worker would show generic words while locked.

An account is not required for the app, so people with no account need a separate decision: an optional device passcode or platform passkey that does the same job.

## 5. Recommended remediation, in order

Each stage is its own release with its own tests and rollback, and none deletes data.

| Stage | Change | Findings | Size |
| --- | --- | --- | --- |
| 0. Hygiene | Clear every in-memory key and password state in all signed-out paths and on the signed-out event (F4). When a session ends without a user sign-out, remove the stored key (F5), after a design check that it cannot interfere with the sign-in return flows. Report a failed remote sign-out, retry it when online, and add a test that pins the local-first removal (F6). Confirm whether sign-out should end all devices (F6 note) | F4, F5, F6 | Small |
| 1. Secrets | Keep service and third-party credentials and inbox keys sealed under the data key (or clear them at sign-out with a clear "reconnect" path), and decide what sign-out does to the published calendar link (turn it off with a message, or ask) | F3, F7 | Medium |
| 2. Copies and files | Seal the daily copies, the put-away backups, the notice cache and the file stores under the key; the worker shows generic words while locked | F2 | Medium |
| 3. Local data protection | Seal the primary stores at rest, add a Locked state apart from signed-out, an unlock that works offline (the passphrase-wrapped key is kept on the device), a "Lock now", the optional passcode or platform passkey for people with no account, and a migration with a rollback and no data loss | F1, F8 | Large; needs its own design review |

The owner decides first: (a) what sign-out should mean for a device with data (locked and recoverable, versus only disconnected); (b) whether sign-out ends every device; (c) whether it turns off the calendar link; (d) the order above.

## 6. Limits of this audit

- Not measured on real devices, Safari or an installed iPhone Home Screen app (each has its own storage, which is why F5 matters there).
- The service worker, Cache Storage and the file stores were read in code, not driven in a browser. Passkey sign-in, the sign-in pass, shared-list joins, and the `send-reminders` function were not exercised.
- The server was not queried: whether the calendar row, the reminder rows and the push subscription remain after an offline sign-out is from the code and the network trace.
- Threat models assumed: a person with the unlocked or shared device; a program or extension with access to the page or profile; a lost device (where the operating system's encryption is the first protection). Network attackers and the Supabase service itself are out of scope.

## 7. Reproducing the measurements

`signout-harness.test.ts.txt` is a Vitest file (jsdom, fake IndexedDB, a stub `fetch`). Copy it to `src/tests/audit/signout.test.ts` in a scratch checkout, then run `npx vitest run src/tests/audit/signout.test.ts --silent=false` and read the printed lines. It is saved as `.txt` so the suite does not run it.
