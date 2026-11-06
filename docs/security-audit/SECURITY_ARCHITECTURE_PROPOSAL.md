# Unified Session Security & Local Data Protection: architecture proposal

Status: **proposal for the owner's approval. Nothing is implemented.** Authentication, storage and encryption are not to be touched until this is approved. It follows `SESSION_SECURITY_AUDIT.md` (same folder), which found that sign-out ends the session and forgets the account key but leaves every local record readable.

## 0. Decisions already made by the owner (2026-11-06)

1. **Sign-out means lock the device and keep its data.** All private information becomes inaccessible; the local database stays intact but sealed; keys leave memory; opening the app shows a locked screen; unlocking restores the existing data; no connection is needed to unlock. Local data is never deleted to achieve this.
2. **Two actions.** *Sign out of this device* locks this device and revokes its own session. *Sign out everywhere* revokes every session and locks every connected device. Signing out on one device does not lock the others by default. A device must learn of a revocation when it reconnects and also while it is active.
3. **The calendar link is a separate setting.** Signing out does not change a sharing arrangement. The person gets a clear way to turn the link off, and can see whether a link is active.
4. **Order.** The encryption architecture is designed before any storage-copy protection is built (this document). Stage 3, sealing the primary databases with a unified Locked state, is the largest and needs a careful migration.
5. **One implementation for the whole family.** A shared Identity & Session layer and a shared Local Security layer; no app does its own. Every app respects the same lock state, and no app can bypass it by opening its own address.
6. **Approve the architecture before authentication or storage change.**

## 1. Goals, threats, limits

**Protects against** (what a person without the unlocked app can do): reading a lost, stolen, borrowed or shared device's browser profile; copying the profile to another machine; opening the app after sign-out and reading its screens; a former session on a device the owner has since revoked.

**Does not protect against:** an attacker who is present while the app is unlocked, or who runs code in an unlocked page (a malicious extension, an injected script): a key that can be used can be used by that code, though it cannot be copied out because keys are non-extractable. Operating-system malware. The person choosing to keep the app unlocked. Record counts, sizes and write times (metadata) are not hidden.

**Constraints that shape the design:** local-first and offline (the app must open, unlock and work with no network); web-first with native shells only additive; no account required to use the app; no records deleted as a protective measure; iPhone Home Screen apps each keep their own storage; the owner's rule that an app never asks for attention that was not chosen.

## 2. What exists today (the starting point)

- **Account Data Key (ADK).** AES-GCM 256, non-extractable on the device, kept in the device database (`syncMeta.dataKey`) while signed in. It encrypts what syncs. It is wrapped by the passphrase (PBKDF2, 600,000 iterations), the recovery key (HKDF) and, optionally, a passkey's PRF secret; the wrapped copies live on the server (`user_keys`, `passkeys.wrap`). Nothing about it changes in this proposal, so no server data is re-encrypted.
- **Local data is plaintext.** About thirty IndexedDB stores in `proairetos`; device-only file databases (`ktema-files`, `philia-photos`, `phyton-photos`, `poreia-files`, `theoria-files`, `askesis-music`); 226 browser-storage call sites in 72 files, 21 of which reach the data through the shared `collection`, `stored` and `readRecords` helpers (synchronous reads); backups (`proairetos-daily`, `proairetos-accounts`); the notice cache in Cache Storage.
- **Seams that help.** The IndexedDB repositories sit behind interfaces with an in-memory twin; the family apps' records go through one `collection` helper; Phase 3 providers read other apps' records through one reader (`ctx.records`, `readRecords`); every app starts through `startApp` or Proairetos's `main.tsx` (18 entry points, 15 service workers); `apps:check` already validates every app against the manifest.
- **Device registry.** `account_devices` (device key, label, platform, `revoked_at`) records devices; it holds no session identifier, so revoking one device cannot yet end that device's session on the server.

## 3. Key hierarchy

```
passphrase ──PBKDF2──┐
recovery key ──HKDF──┤            ┌── wraps ──> Local Vault Key (LVK)   ── seals local data at rest
passkey (PRF) ───────┤ unlock ────┤
device passcode ─────┘ factors    └── wraps ──> Account Data Key (ADK)  ── seals synced records (unchanged)
(native: Keychain/Keystore + biometrics, a convenience factor only)
```

- **Local Vault Key (new).** A random AES-GCM 256 key made per storage partition (a browser profile, or an installed app's own storage). It seals local data. It is separate from the ADK because (a) a person with no account needs one, (b) it must not depend on the account's lifecycle (sign-out, a different account on the same device, account deletion), and (c) it can be rotated without touching the server.
- **Unlock factors.** The LVK is wrapped once per factor and the wrapped copies are kept on the device in a **vault header** (a small record: version, factor list, salts, iteration counts, wrapped keys, a check value). A wrapped key reveals nothing without its factor, so keeping it locally is safe, and it is what makes offline unlocking possible. The same passphrase, recovery key and passkey that open the ADK open the LVK, so a signed-in person has one thing to remember.
- **A device passcode** (opt-in) is a factor for people with no account: a passcode through PBKDF2 into a wrapping key. Turning it on requires saving a **recovery key**, because forgetting both means the local data cannot be read (said once, plainly, when it is turned on). The existing Reflect passcode stays a separate screen gate.
- **Where the LVK lives.** In memory only, as a non-extractable key, while the app is unlocked. A key that stays in the database is usable by anyone who opens the app, so protection comes from removing it. The opt-in *Stay unlocked on this device* mode (section 5) may keep it in the database; that is today's behavior and is labelled as such.
- **Changing a factor** (a new passphrase) re-wraps the LVK only: cheap, no data is re-sealed. **Rotating the LVK** (suspected exposure) re-seals everything as a resumable job.
- **Sealing a record.** AES-GCM with a fresh random 96-bit nonce per write; associated data names the store, the record id and the format version, so a sealed record cannot be moved to another place and still open.

## 4. What is sealed, and how

Classification first, because not everything is private:

| Class | Examples | Treatment |
| --- | --- | --- |
| Private records | every app's records, reflections, medicines, bills, trips, notes, books, photos, attachments | sealed under the LVK |
| Credentials and device secrets | Strava and cloud-library tokens, the capture and health inbox keys, shared-list keys, the sign-in pass key | sealed under the LVK, or cleared at disconnect |
| Copies | daily backups, put-away account backups, the notice cache, the share inbox | sealed under the LVK |
| Not private | appearance, text size, the offline shell, map tiles, static assets | left readable |

**IndexedDB stores.** The repository layer seals the stored value and keeps an opaque id and the write time in the clear. Queries that used indexes (by date or status) run against in-memory indexes built when the vault unlocks. The data sets are small (thousands of records); the unlock budget is set in section 11 and measured before anything ships.

**Browser-storage records.** The 21 files that use `collection`, `stored` and `readRecords` move behind one **secure storage facade** with the same synchronous API: it holds an in-memory copy filled at unlock and persists sealed values behind it (write-behind, flushed when the page is hidden or closed, with a journal so a crash cannot lose a write). The remaining call sites that hold private data are moved onto the facade one app at a time, using the classification above; non-private settings stay plain. A static check keeps new private keys off raw `localStorage`.

**Files and photos.** Sealed per file, in chunks for large books so that opening one does not need the whole file in memory.

**Backups.** Daily copies and put-away backups are sealed under the LVK and restore only while unlocked. *Save a backup file* keeps its existing optional password; the person is offered the encrypted form first. A readable export stays an explicit action that leaves the device by the person's choice.

**Notices and push.** While locked, the worker cannot open words. Notices show the app's name and the time only (the existing private lock-screen form, `privateNotice`), and sealed push payloads show the generic line. While unlocked, behavior is unchanged. This also settles the notice cache: it is sealed, or not written while locked.

**Servers.** No change to what the server stores or can read.

## 5. Lock, unlock and the offline experience

- **States.** *Locked* (no key in memory, header present), *Unlocked*, and *No vault* (a device that has not turned protection on, or a person with no account who has not set a passcode, behaves as today). Sign-in alone never creates a surprise prompt: a device gets a vault when the person signs in or turns protection on, through the migration in section 7.
- **Sign out of this device** (the new default meaning of sign-out): revoke this device's session, remove the LVK from memory and from the database, close the remembered-key option, show the locked screen. Records are untouched.
- **Unlock offline.** Passphrase or recovery key against the header; a passkey where the device offers it (a platform passkey's assertion works without a network); a device passcode. No server call is needed. An unlock with the account factors also restores sync when the session returns.
- **Stay unlocked on this device** (opt-in, per device): the LVK stays in the database as a non-extractable key so a reload does not ask again, and sign-out still removes it. It is bounded by an **offline grace period** (a deadline refreshed by every successful contact with the server; past it the app locks). This protects a lost device that is also offline for a long time, within the limits stated in section 9. The default for a signed-in device is the owner's decision (section 12).
- **Across pages.** Unlocking in one tab hands the non-extractable key to the other live pages of the same storage over a `BroadcastChannel` (a key object can be structured-cloned between same-origin pages without its bytes being exposed), so a person unlocks once for all of Proairetos and the companion apps open in that profile. *Lock* is broadcast the same way and every page drops the key and shows the locked screen at once; a Web Lock makes lock and unlock one at a time. If no live page holds the key, the next page to open asks.
- **No bypass by address.** Every entry point calls one security start-up before it reads data, so `/soma/`, `/ktema/` or any other address opens the same locked screen. `apps:check` is extended to fail if an entry point or worker skips it, and a browser test opens every app's address while locked.
- **Locked screen.** Plain: the app's name, Unlock, "Use a passkey" where available, "Forgot it?" leading to the recovery key, and Sign in on a device with no vault. No instructions or reassurance lines, per the writing rules.

## 6. Identity and sessions (device-specific)

- **One session per storage partition**, shared by every app in it (as today). Each partition is a *device* for revocation purposes (`account_devices.device_key`).
- **Sign out of this device** calls `signOut({ scope: 'local' })`. **Sign out everywhere** calls `scope: 'global'` and marks every device revoked. Today only the global form exists and it is the only one exposed.
- **Revoking a chosen device** needs the server to end that device's session. Plan: record the session identifier (`session_id` in the access token) on the device row at registration, and add an Edge Function that, for the signed-in owner, deletes that session and sets `revoked_at`. **This needs a migration and an Edge Function deploy, each requiring the owner's approval at its time.**
- **Detecting revocation while active:** on focus, every five minutes, and on any failed refresh the device re-reads its own registry row and its session; a revoked device **locks** (it no longer wipes the key and returns to sign-in, which is what it does today). Offline devices learn on reconnect; this window cannot be closed and is bounded by the offline grace period.
- **Failed remote sign-out** is reported ("Signed out on this device. Reconnect to end the session everywhere") and retried when the device is online.
- **Account switching** keeps today's rule: the previous account's data is put away (now sealed) and the new account starts clean.

## 7. Migrating existing plaintext without losing anything

Every sealing stage follows the pattern that K0 and K1 used for notices: a release that can **read** both forms ships first and runs for at least seven days; the release that **starts sealing** follows; a revert of the second always lands on a build that still reads both. Within a release:

1. **Prepare (no data change).** Create the vault header and LVK with the person's existing factors, only while the account key is open or a passcode is being set. Take a sealed **safety copy** of everything first.
2. **Per store, a journaled state machine:** plaintext → *dual* (every write goes to both, existing rows are copied sealed in small batches) → *verified* (each sealed row is opened and compared with its plaintext by hash) → *sealed* (reads and writes use the sealed form only) → *cleaned* (the plaintext rows are removed). The journal makes it resumable after a crash or a closed tab. A row whose verification fails keeps its plaintext and stops the pass with a message; nothing is removed until its sealed twin opens.
3. **Removing the plaintext of a verified sealed row replaces it; it is not deleting a record.** It is still the step that needs the owner's explicit approval per stage, and it runs only after the safety copy exists and the verified count equals the record count.
4. **Rollback.** Before *cleaned*, any build still finds the plaintext. After *cleaned*, rollback is to the reading build, never to a build that cannot read sealed data. A person can export a readable copy at any time.
5. **Storage-partition reality.** Each iPhone Home Screen app migrates its own storage separately; a progress screen is not shown (the work is quick and batched), and an interrupted migration resumes on the next open.

## 8. Backup, restore and recovery

- **Restore from a backup file** onto a device with no vault creates a vault with a new LVK and seals what it restores; restore onto a device with a vault asks for an unlock first. Older plaintext backups still restore.
- **New device:** sign in, unlock with the passphrase or passkey (this opens the ADK), sync brings the records, and the device creates its own LVK wrapped by the same factors. Nothing sealed under another device's LVK is copied between devices; sync carries ADK-sealed records only.
- **Forgot the passphrase:** the recovery key re-wraps both the ADK and the LVK under a new passphrase (the existing flow, extended to the header).
- **Lost both:** synced data cannot be opened (the existing statement), and the local sealed data cannot be opened either. For a person who still has the unlocked app elsewhere, the readable export and the backup file are the way out; this is said at the moment a passcode or vault is created.
- **Lost or stolen device:** from another device, *Sign out everywhere* or revoke that device (section 6). The sealed data on the lost device stays sealed unless the thief has the passphrase or the device was left in *Stay unlocked* mode and is within its offline grace period; section 9 states this honestly. The owner can also rotate the account key if they fear exposure.

## 9. Compatibility and platform realities

- **Browsers (desktop, Android Chrome, Safari).** Web Crypto, IndexedDB, `BroadcastChannel` and Web Locks are available in all current targets; structured-cloning a key over `BroadcastChannel` and Web Locks are to be confirmed on the oldest supported Safari. A fallback (ask again per tab) exists if a target cannot hand a key across pages.
- **iPhone Home Screen apps** keep their own storage: each has its own vault, session and unlock, and a sign-out in one does not reach the others. This is why revocation has to be server-side and detected by each app (section 6), and why the offline grace period matters there.
- **Passkeys with PRF** unlock the vault in one tap where the platform supports PRF on use (the existing code already handles the iPhone case that needs a second tap). Where it is unavailable, the passphrase is the factor.
- **Capacitor shells (iOS, Android WebView).** Optional and additive, per the web-first rule: a native plugin may hold a wrapping key in the Keychain or Keystore behind biometrics as one more unlock factor. The web path must work without it, and nothing in this proposal requires the shell.
- **Service workers.** The 15 workers cannot hold the key; they show generic notices while locked and use the existing private form. The fetch handlers are unchanged because the offline shell is not private.
- **Storage eviction.** Browsers may evict storage; the existing `keepStorage()` request and daily copies are unchanged, and the vault header is part of what is backed up and synced as a device record.

## 10. Staged plan (adjusted order)

| Stage | Work | What a person gets |
| --- | --- | --- |
| 0. Session | Clear memory (key, passkey and pending-password state) in every signed-out path and on the signed-out event; remove the stored key when a session ends without sign-out; local and global sign-out as two actions; report and retry a failed remote sign-out; detect a revoked device while active and clear its key. Cross-tab lock of the signed-out state | Sign-out is consistent across tabs and apps; "Sign out of this device" and "Sign out everywhere" |
| 1. Credentials and sharing | Service tokens and inbox keys cleared when a service is disconnected and at sign-out, with a reconnect path (sealed under the LVK later); a visible state of the calendar link and one clear place to turn it off, separate from sign-out; shared-list keys handled the same way | Nothing credential-like survives a sign-out; sharing is visible and separate |
| 2a. Vault core | Vault header, LVK, factors, secure storage facade, lock coordinator, locked screen, offline unlock, the start-up check in every entry point and `apps:check`. **Reading release first, no sealing** | The machinery exists and is tested; nothing is sealed yet |
| 2b. Copies, files, notices | Seal daily copies, put-away backups, the notice cache, photos and files, credentials | Copies and files are protected |
| 3. Primary stores | Seal the IndexedDB stores and the browser-storage records, make sign-out lock, the *Stay unlocked* option and grace period, the device passcode for accountless people, the journaled migration | The stated outcome: sign-out locks the device and the data stays sealed and offline-readable |

Between stages the app behaves as today for anything not yet protected, and each release says so in What's new only when a person can see a change. Every stage is its own pull request with its own tests, a rollback, and the K0/K1-style gap before sealing begins.

**Needs approval at its time, separately:** the migration and Edge Function for revoking one device (Stage 0 or 1), each plaintext-removal pass (2b and 3), and any change to authentication or encryption behavior.

## 11. Verification plan

- **Unit and integration.** Key hierarchy, header versioning, wrap and unwrap with every factor, wrong-factor failures, associated-data binding, rotation, the journaled migration (crash at every step, partial batches, verification mismatch), and the two-instance harness from the audit extended to lock and unlock across pages.
- **Browser.** Every app's address opened while locked (no private data in the DOM, storage reads return sealed rows only); sign-out in one tab locks the others; the offline unlock with the network blocked; a reload in each mode; the worker's locked notices.
- **Data safety.** Before and after counts and hashes for every store on a seeded copy of a large profile; a migration run killed at random points and resumed; the backup round trip.
- **Performance.** An unlock budget (target under 300 ms for ten thousand records, to be set after measuring), the first paint budget in `speed-check`, scroll cost, and sealing throughput on a slow CPU.
- **Real devices.** iPhone Home Screen and Safari, Android Chrome, a desktop browser; passkey unlock with and without PRF; offline grace expiry; revocation from another device.
- **Language.** All new text passes the writing standards and the language guard.

## 12. Decisions for the owner

1. **Default for a signed-in device:** unlock on every launch, or *Stay unlocked on this device* until sign-out (today's convenience, with the grace period)? Recommendation: stay unlocked until sign-out, with a per-device switch to lock on every launch.
2. **People with no account:** nothing changes until they turn on a device passcode, with a recovery key required. Agreed?
3. **Offline grace period** for *Stay unlocked*: recommended 14 days of no server contact; shorter for a revoked device on reconnect (immediate).
4. **A separate LVK** (recommended) or sealing under the ADK for signed-in people (simpler, but no protection for people with no account and it ties local data to the account's lifecycle).
5. **PBKDF2 at 600,000 iterations** stays (Web Crypto has no stronger memory-hard option); the passphrase's strength is the weak point and is said so where it is set.
6. **The server pieces** (session id on the device row, a revoke Edge Function): approved to design, with each deployment approved separately?
7. **Native Keychain/Keystore factor:** include in the plan as a later optional stage, or leave out for now?
8. **Order:** Stage 0 first as proposed, or Stage 2a (the vault core) first so that Stage 0's sign-out can lock from the start?

## 13. Not decided here, to be measured first

How much of the 226 browser-storage call sites move onto the facade versus staying plain (the classification pass is the first piece of Stage 2a); the exact unlock budget; whether write-behind is safe enough for every key or a few need synchronous sealed writes; the cost of sealing large books; and the oldest Safari behavior for key hand-over between pages.
