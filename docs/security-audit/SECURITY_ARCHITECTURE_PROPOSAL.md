# Unified Session Security & Local Data Protection: architecture proposal (simplified)

Status: **proposal; nothing is implemented.** No authentication, storage or encryption change is made until the owner approves. It follows `SESSION_SECURITY_AUDIT.md` (same folder): sign-out ends the session and forgets the account key, but every local record stays readable. This revision (2026-11-06) replaces the first, larger proposal after the owner asked for the simplest design that meets the goal.

## 1. The goal

When someone signs out of Proairetos, another person opening that browser cannot see their personal information. Their data stays on the device, intact and recoverable, and comes back when they unlock.

The experience: open Proairetos, unlock when necessary, use any companion app without unlocking again, sign out or lock, and everything private becomes unreadable with nothing deleted.

## 2. Four requirements

1. **Encrypted local data.** Personal information is not readable after sign-out. A locked screen alone does not count: the stored data itself is encrypted.
2. **Preserved data.** Sign-out and lock never delete records, settings or history.
3. **Simple unlocking.** The existing passphrase, passkey or recovery key. No new password.
4. **Unified protection.** One shared security service; every app uses it and none can bypass it.

## 3. The design

```
account credentials:  passphrase · passkey · recovery key   (all exist today)
                              │
                 Unified Security Service  (one module, shared by every app)
        local key · lock and unlock · locked screen · sign-out
                              │
                 Encrypted local storage  (one mechanism)
                              │
              Proairetos · Ergon · Theoria · Askesis · every companion app
```

- **One local key.** A random AES-GCM 256 key, made on the device, seals local data at rest. It is separate from the account key (which seals what syncs and does not change) because it must keep working when the account session ends, and re-sealing local data must never touch what is on the server.
- **Opened by what people already have.** The local key is stored on the device only in wrapped form (a small header), wrapped by the same passphrase, recovery key and passkey that open the account key. Nothing new to remember. Because the wrapped key is a local record, **unlocking works offline**.
- **In memory only while unlocked.** The key is never left in the database: a key that stays there is usable by anyone who opens the app, so protection comes from removing it. A fresh open with no unlocked page asks for the unlock. The key is non-extractable, so it can be used but not copied out.
- **Shared simply.** Unlocking in one page hands the same key object to the other open pages of that browser profile over a `BroadcastChannel` (a key object can be passed between same-origin pages without exposing its bytes). So one unlock covers Proairetos and every companion app open in the profile. Locking is sent the same way and every page drops the key at once. If the browser cannot pass a key between pages, the fallback is to ask again per page; nothing more elaborate.
- **Sign out or lock.** *Sign out* ends the session and locks. *Lock now* locks without signing out. An inactivity lock is an optional setting, default off, and can come after the rest.
- **One authority, no bypass.** The security service is started by `startApp` and Proairetos's `main.tsx`, before any app reads private data, so `/soma/`, `/ktema/` or any other address opens the same locked screen. `apps:check` fails if an entry point or worker skips it, and a browser test opens every app's address while locked.
- **Two sign-outs with what Supabase already offers.** *Sign out of this device* uses the client's `scope: 'local'` (the code already uses it for a revoked device); *Sign out everywhere* uses `scope: 'global'` (what sign-out does today). No Edge Function and no server change. (That `local` ends only this device's session is to be confirmed in a test against a real project in Stage 1.)
- **One session per browser profile.** Companion apps in the same profile share it. Separate installed iPhone Home Screen apps each keep their own storage and therefore their own session and lock; each honors a server-side sign-out when it next reaches the server (and while active, on focus and on a failed refresh).

## 4. What it protects, and what it does not

**Protects:** someone opening a signed-out or locked browser, reading or copying its profile, or reading a lost or borrowed device's storage. **Does not protect:** an attacker with the app unlocked in front of them, or code running inside an unlocked page. Record counts, sizes and write times are not hidden. Until Stage 3 finishes, sign-out still leaves records readable, and the docs say so.

## 5. What is sealed

| Class | Examples | Treatment |
| --- | --- | --- |
| Private records | every app's records, reflections, medicines, bills, trips, notes | sealed |
| Credentials and secrets | Strava and cloud-library tokens, capture and health inbox keys, shared-list keys | sealed (or cleared when a service is disconnected) |
| Copies and files | daily and put-away backups, the notice cache, photos, attachments, book files | sealed |
| Not private | appearance, text size, the offline shell, map tiles | left readable |

IndexedDB values are sealed behind the repository interfaces, with the id and write time in the clear and in-memory indexes built at unlock. The 21 files that use the shared browser-storage helpers move behind one facade with the same synchronous API (an in-memory copy filled at unlock, sealed writes behind it). The other private call sites move onto the facade app by app; a check keeps new private keys off raw `localStorage`. Each record is sealed with a fresh nonce and associated data that names its store and id. While locked, notices show the app's name and the time only (the existing private form).

## 6. Four stages

Each stage is its own pull request with tests, a rollback and the owner's approval. Sealing stages follow the K0/K1 method: a release that can **read** both forms ships first and runs at least seven days before the release that starts sealing.

**Stage 1. Fix logout and session security** (no encryption). Clear the key, passkey and pending-password state in every signed-out path and on the signed-out event, so other tabs and apps lock; remove the stored key when a session ends without a sign-out; handle a revoked device and a failed refresh; offer *Sign out of this device* and *Sign out everywhere*; report a failed server sign-out and retry it when online; make sure no page keeps working from a stale key. Also here, because it is small and separate: the calendar link shows whether it is active and has its own place to turn it off (sign-out does not change it). Plan: `STAGE1_PLAN.md`.

**Stage 2. Encryption foundation** (no data migration). The local key, the header, unlock with the account credentials and recovery key, offline unlock, the shared service, the Locked screen and the start-up check in every entry point. It ships first as a reading build and seals nothing.

**Stage 3. Protect existing local data.** Seal the databases, backups, attachments, files, credentials and the notice cache, and migrate what is already there without losing anything: a sealed safety copy first; per store a journaled sequence of plaintext, dual writes, verified, sealed, then plaintext removed, resumable after a crash; plaintext removed only after its sealed twin opens and counts match, which needs the owner's approval for each pass; rollback always lands on a build that reads both forms. A store is sealed only when every reader of it, including search, Home, Calendar and Library, already goes through the service. Restore and recovery are verified before the pass is approved.

**Stage 4. Complete ecosystem integration.** The remaining companion apps and the providers (search, Home, Calendar, Library, notifications) on the service, and the final cross-ecosystem testing: several tabs, a companion app left open in another tab, other browsers, installed mobile versions, optional bridge apps.

Stages 3 and 4 interleave in practice, because a store cannot be sealed before its readers are ready; the sealing is therefore ordered by app group, and the order is settled when Stage 3 is planned.

## 7. The three things not to compromise

- **Recovery.** Changing a passphrase re-wraps the one local key and re-seals nothing. A forgotten passphrase is recovered with the recovery key, which also re-wraps the local key. Nothing is removed until its sealed copy opens, there is a safety copy, and a failed or interrupted migration resumes and leaves the plaintext in place. Lost passphrase and recovery key together mean the local sealed data cannot be opened (as already true of synced data); this is said where the key is made. A readable export remains available while unlocked.
- **Encryption.** Real sealing of the stored data, not a screen gate; tested by reading the raw storage while locked.
- **Compatibility.** Existing users migrate safely; the web app keeps working in desktop and mobile browsers and, optionally, in the bridge apps. A browser that lacks a needed feature falls back to asking per page, never to unprotected storage without saying so.

## 7a. Conditions the owner set on the encryption work

These bind Stages 2 and 3 and are checked in each stage's pull request.

1. **Argon2id is evaluated before the encryption format is final.** The key-derivation choice for the passphrase wrap (PBKDF2 today, Argon2id as the candidate through a vetted WebAssembly library) is decided, with measurements of time and memory on a slow phone, bundle size, content-policy fit and the wrap-format change, before the header format of Stage 2 is fixed. PBKDF2 stays only provisionally until then.
2. **The key-wrapping design is reviewed before implementation.** How the local key is wrapped by the passphrase, the passkey and the recovery key, what the header holds, how a passphrase change re-wraps it, and what an attacker holding only the header can try, are reviewed and approved before any of it is built.
3. **Plaintext is never removed until the encrypted replacement is verified and recoverability is established.** A record's plaintext stays until its sealed copy opens, counts and hashes match, a safety copy exists and a recovery (restore from that copy, and unlock with each credential) has been demonstrated. Each plaintext-removal pass needs the owner's approval.

Also standing: every stage is its own pull request with its own tests and rollback; there is no large all-at-once migration; no user data is deleted.

## 7b. Outstanding limitation until Stage 3

Signing out does not yet protect the local records. Stage 1 removes the keys and ends the session, but the records on the device stay readable by anyone who opens the app or reads the browser profile. This is a known, unresolved security limitation, not a completed protection, and every release note, plan and status line says so until Stage 3 seals the records.

## 8. Postponed

| Item | Decision | Revisit when |
| --- | --- | --- |
| Device passcode or PIN for people with no account | Postponed. They have no sign-out; nothing changes for them until a decision. A short numeric PIN is guessable offline, so a future option must be a strong passphrase or a platform credential, with a mandatory recovery key | after Stage 4 |
| Persistent unlocked key and a 14-day offline grace period | Removed. A browser cannot enforce a deadline against someone who controls the profile | only with a platform-backed option |
| Revoking one chosen device from another device | Later. Needs a session identifier on the device record and a server function; first confirm in Supabase's documentation and a test project that an arbitrary session can be ended | after Stage 4, if needed |
| Custom Edge Functions | Only if the existing services cannot do it | with the item above |
| Native Keychain or Keystore factor | Future optional enhancement; the web path must not need it | later |
| Argon2id instead of PBKDF2 | Evaluate before PBKDF2 is treated as permanent: a vetted WebAssembly implementation is possible (the site's content policy already allows WebAssembly); memory use on phones, bundle size and the wrap-format change need measuring. PBKDF2 (600,000 iterations) is reused for now | before Stage 2 settles the header format |
| Elaborate key transfer, extra abstraction layers | Not built; the shared `BroadcastChannel` hand-over and one storage facade only | n/a |

## 9. Verification (per stage, and at the end)

Unit and integration tests of the key, header, every credential, wrong-credential failures, a record opened only with its own id and store; the migration killed at random points and resumed; counts and hashes before and after on a large seeded profile; the audit's two-instance harness extended to lock and unlock across pages; a browser test of every app's address while locked, of raw storage while locked, of offline unlock with the network blocked and of a companion app left open in another tab; speed and unlock budgets; real devices (iPhone Home Screen, Safari, Android Chrome, desktop) with and without passkey support. All new text follows the writing standards.

## 10. Decisions already made, and what is still open

Made by the owner: sign-out locks and keeps the data; sign out of this device versus everywhere; the calendar link is separate; one local key (kept for proper separation); no new passwords; require an unlock when no unlocked page remains, share the unlock between open pages, lock on sign-out, offer Lock now; no persistent unlocked key; the four stages above.

Open: (a) the Argon2id evaluation before the header format is fixed; (b) whether the inactivity lock is part of Stage 2 or later; (c) the order of apps inside Stages 3 and 4; (d) the Stage 2 unlock performance budget, set after measuring.
