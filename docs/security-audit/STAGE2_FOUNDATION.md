# Stage 2: the shared encryption foundation

Status: built, tested, **not merged or deployed**. **Nothing in it is switched on:** no vault is made, no record is sealed or moved, no stored data changes. It is the machinery Stage 3 will use. The format below is a **proposal for the owner's review**; it is not final until approved.

## 1. What it is, in one paragraph

One Local Vault Key (LVK) per browser profile, held in memory only while unlocked, sealed on disk under the account's existing data key, which the account password, a passkey or the recovery key already open. One shared service keeps it, locks and unlocks it, and shares the unlocked state between every open page (Proairetos and each companion app). Every app mounts behind one gate. Existing authentication, passphrases, recovery keys and passkeys are reused unchanged; there is no new password and no new algorithm.

## 2. Key hierarchy (proposed format, version 1)

```
 account password ─ PBKDF2-SHA256 (600,000) ─┐
 recovery key (160 bits) ─ HKDF-SHA256 ──────┼─ unwrap ─> Account Data Key (ADK)   AES-GCM 256, non-extractable
 passkey secret (WebAuthn PRF) ─ HKDF ───────┘                  │      (exists today; seals what syncs; unchanged)
                                                                │ AES-GCM seal, AD "proairetos-vault-lvk:<vault id>"
                                                                ▼
                                          Local Vault Key (LVK)  AES-GCM 256, random, non-extractable, memory only
                                                                │ AES-GCM seal, AD "local:<store>:<record id>"
                                                                ▼
                                          local records and files (Stage 3)
```

- **Vault header** (`proairetosVault`, plus a second copy in its own small database `proairetos-vault`; both device-only, outside backups and sync): `{ v: 1, id, createdAt, updatedAt, lvk: {iv, ct}, check: {iv, ct}, account: { userId, passphrase wrap, recovery wrap, passkey wraps } }`. `check` is a known sentence sealed under the LVK; opening it proves the right key. The `account` copies are the account's own wrapped keys (already encrypted), kept so that unlocking works **offline**. Nothing in the header is secret.
- **Why a separate LVK** (the owner approved it): local sealing does not use the key that seals server data; it can be rotated without touching the server; later factors (a device credential for people with no account) can wrap it without changing anything else; and sign-out removing it cannot affect sync.
- **Memory only:** the LVK is never written to a database. Protection after sign-out comes from the key being gone, not hidden.
- **Changing a password** re-wraps the account's key (as today); the vault follows when the controller refreshes its copy; **nothing sealed is re-sealed**.
- **Recovery:** the recovery key opens the ADK and so the LVK. If both copies of the header are lost, the LVK is lost and anything sealed under it cannot be read; Stage 3 must therefore keep the plaintext until verified and must make a recoverable copy first (`STAGE3_READINESS.md`).

## 3. Cryptography decisions

**Authenticated encryption: AES-256-GCM through Web Crypto**, as the app already uses everywhere (`sealRecord`, `sealBytes`, key wrapping): a fresh random 96-bit nonce per seal, associated data naming what is sealed (store and id), so a value moved to another id or store does not open. Reasons: established (NIST SP 800-38D), native in every target browser, no new dependency, already reviewed in this code base. XChaCha20-Poly1305 would allow random nonces without limit but is not in Web Crypto and would need a library; not justified. **Limit to respect:** random 96-bit nonces are safe to about 2^32 seals under one key. At thousands of writes a day that is millennia; the 2,000-seal nonce test and the LVK's rotation path (Stage 3, re-seal job) cover it.

**Passphrase derivation: nothing new.** The vault derives nothing from a passphrase itself. It reuses the account's existing PBKDF2-SHA256 (600,000 iterations) envelope, so the foundation does not depend on the KDF choice.

**Argon2id evaluation** (measured; hash-wasm 4.12, MIT; Chromium 1x with the CPU throttled where marked; PBKDF2 here is the browser's native one and the throttle does not slow it, so the throttled rows flatter PBKDF2):

| Derivation | Node | Chromium | CPU 4x | CPU 6x |
| --- | --- | --- | --- | --- |
| PBKDF2-SHA256, 600,000 (existing) | 96 ms | 95 ms | 98 ms | 98 ms |
| Argon2id m=19 MiB, t=2, p=1 | 62 ms | 46 ms | 243 ms | 379 ms |
| Argon2id m=46 MiB, t=1, p=1 | 118 ms | 73 ms | 438 ms | 603 ms |
| Argon2id m=64 MiB, t=3, p=1 | 232 ms | 219 ms | 1,131 ms | 1,755 ms |

Size: the Argon2id module is 29 KB (11.6 KB gzipped, WebAssembly inside); the site's content policy already allows WebAssembly. Argon2id is memory-hard, which is the property PBKDF2 lacks against offline guessing with GPUs; that matters most for the **account password wrap, which is what protects a lost device's vault**. Costs: a dependency; main-thread blocking unless run in a worker; 19 to 64 MiB of memory (phones); and, decisively, **a format change to the account's server-stored password wrap**: an older build that cannot read it would be locked out. The parameter values above are the commonly recommended minimums as I recall them (OWASP, RFC 9106); re-verify before adopting.

**Recommendation for the owner's review:** keep PBKDF2 for this foundation (it is untouched and nothing here depends on it), and treat Argon2id as its own later release: a read-first build that understands both (with a `kdf` field in the envelope and the existing `iterations` kept), then a build that rewraps the password envelope with Argon2id (m=19 MiB, t=2, p=1, in a worker) the next time the password is entered, and only then drop PBKDF2 for new wraps. It must not ship before the oldest supported build can read it. The vault header has no KDF field to change when that happens.

**Factor review (passphrase, passkey, recovery key):**

| Factor | Reaches the ADK by | Offline | Notes |
| --- | --- | --- | --- |
| Account password | PBKDF2 against the password wrap kept in the header | yes | An account set up with a passkey and no password has none; the header says so (`hasPassphrase`). A password changed on another device is followed when this device next refreshes its copy; until then the old password still opens this device's vault |
| Recovery key | HKDF against the recovery wrap | yes | 160 random bits; unchanged; also the way back if the password is forgotten |
| Passkey (PRF) | HKDF of the PRF secret against the passkey's wrap | yes where the platform authenticator works without a network; needs the PRF extension | iPhone gives the secret only on use, not on creation: existing handling applies |
| Account key already open | the sync controller offers it | n/a | how a signed-in device opens the vault with no prompt |

## 4. What was built

| Piece | Where | Purpose |
| --- | --- | --- |
| Vault: LVK, header, validation | `src/data/security/vault.ts` | create, open, check, update the account copies; `VaultError` (`corrupt`, `cannot-open`) |
| Header storage in two places | `src/data/security/vaultStorage.ts` | primary browser storage, second copy in its own database; the newer valid copy wins and repairs the other; reading makes nothing when there is no vault |
| Record store interface | `src/data/security/recordStore.ts` | `SecureRecordStore` over any key-value backend: reads plain and sealed, writes plain unless a store is switched to sealed (Stage 3), `LockedError` while locked |
| The service | `src/app/security/securityService.ts` | state (`none`, `locked`, `unlocked`, `corrupt`), unlock with password, recovery key, passkey or the account key, lock, remember the account's wrapped keys, share the key and the lock between pages |
| The gate and locked screen | `src/app/security/SecurityGate.tsx`, `LockedScreen.tsx`; mounted by `ErrorBoundary`, which every app mounts | with no vault the app is untouched; with one, every app shows the locked screen first and never paints a private screen |
| Session integration | `src/app/sync/syncController.ts` (`setDataKey`, `forgetSecretsInMemory`, `refreshVaultAccount`) | the vault locks whenever the account key is forgotten (sign-out, session end, revoked device), opens when the controller has the key, and keeps its copy of the account's wrapped keys current |
| Two exports in `keys.ts` | `toBase64`, `fromBase64` | reuse; no behavior change |

All the sealing uses the existing `sealRecord`, `sealBytes`, `wrap` and `unwrap`. `SecureRecordStore` is not used by any existing store.

**Cross-page sharing.** Unlocking in one page passes the same non-extractable key object to the other open pages of the browser profile over a `BroadcastChannel`; a page receiving one checks it against the header's `check` before using it. Locking is broadcast the same way. A page that opens while another is unlocked asks for the key. Where a browser cannot pass a key, the page stays locked and the person unlocks it. Every page listens from the start, so a vault made in one page reaches pages that were already open.

## 5. Verification

- **Tests:** 73 in `src/tests/security/` (vault, storage, record store, service, session integration, gate, entry points), and 3 sign-out suites. The full suite passes in UTC, America/Los_Angeles and Pacific/Auckland (292 files, 1824 tests). TypeScript, lint and `apps:check` are clean; the build is clean.
- **Key generation and uniqueness:** each vault gets a new random id and LVK; what one LVK seals another cannot open; 2,000 seals give 2,000 different nonces; the LVK cannot be exported.
- **Encryption and decryption:** round trips; a value moved to another id or store does not open; a value sealed under another key does not open.
- **Incorrect credentials:** wrong password, recovery key, passkey secret or unknown passkey are refused (`KeyError`) and the vault stays locked; another account's key is refused (`cannot-open`).
- **Recovery:** the recovery key opens the vault; a changed password opens it and the old one stops working, with nothing re-sealed.
- **Offline unlocking:** password and recovery key unlock with `fetch` replaced by a function that fails, and in real Chromium with the network cut (no request for a key or to any auth host).
- **Locking across tabs and apps:** unit tests with several pages sharing a channel; in **real Chromium** (`scripts/security-check/browser.mjs`, **20 of 20**): the key object reaches pages already open (Proairetos, Soma, Ktema, Hydros); a value sealed in one opens in another; locking in one locks all four and each shows the locked screen; a wrong password is refused; one unlock opens all; **all 16 apps opened by their own address while locked show the locked screen**, and a page that opens locked never shows the app first; no page errors.
- **Corrupted key handling:** structural damage, a bad field, a changed version, an altered sealed key, an altered check and a header moved to another vault's id are all detected; one damaged copy is repaired from the other; both damaged shows "could not be read", shows no app and **removes nothing**.
- **No vault:** nothing is stored, no database is made, no extra request is sent, and no screen changes (unit and browser).
- **Browser and mobile compatibility:** verified in Chromium only (the only browser installed here). Firefox, Safari (desktop and iPhone) and Android were **not** tested. What the design relies on: AES-GCM and HKDF/PBKDF2 in Web Crypto (universal); structured cloning of a `CryptoKey` through a `BroadcastChannel` (specified; works in Chromium; **not confirmed in Firefox or Safari**; Node's own implementation cannot send some keys, which is why the unit tests use an in-process channel that clones the same way); IndexedDB (a second copy only: the service works from the first alone); Web Locks (optional). If key passing is unavailable the fallback is asking again in that page. Installed iPhone Home Screen apps keep their own storage, so each has its own vault and lock; a sign-out in one does not reach the others.

## 6. Performance (real Chromium, made-up data: 10,000 items of about 0.7 KB, 2,000 reflections of about 1.6 KB, 5,000 small records; 17,000 records, 11.8 MB)

| | no slowdown | CPU 4x | CPU 6x |
| --- | --- | --- | --- |
| Make a vault; open it with the account key | 0.5 ms; 0.1 ms | 2.6 ms; 1.5 ms | 2.4 ms; 0.5 ms |
| Unlock with the password (the existing PBKDF2 dominates) | 102 ms | 122 ms | 137 ms |
| Unlock with the recovery key | 1 ms | 2 ms | 6 ms |
| One record: seal, open (median; 95th percentile) | 0.0 to 0.1 ms; 0.1 ms (0.1 to 0.2) | 0.1 ms; 0.1 to 0.6 ms (0.8 to 1.2) | 0.1 to 0.2 ms; 0.1 to 0.9 ms (1.3 to 1.9) |
| Seal all 17,000 | 0.7 s | 3.3 s | 5.2 s |
| Open all 17,000, one at a time | 1.1 s | 5.0 to 5.4 s | 7.5 to 7.8 s |
| Open all 17,000, in parallel batches | 1.0 s | 4.6 s | 7.6 s |
| Stored size (base64 JSON) | 11.8 MB -> 17.0 MB (1.44x) | | |

What this says: the vault itself costs nothing; **opening every record at unlock is the expensive thing, and it is not AES**: parallel batches barely help because base64 decoding and JSON parsing on the main thread dominate. So Stage 3 must open records on demand and per store, not all at unlock; most screens need a few hundred records (tens of milliseconds). The 1.44x growth matters most for the browser-storage records, which have a 5 to 10 MB limit: sealing those in the present base64 form could exceed it for large data sets, so Stage 3 should store sealed values in a binary form where the store allows (IndexedDB does) and decide the limit for the rest.

## 7. Risks

1. **The header is the one thing that cannot be re-made.** Losing both copies means sealed data cannot be read. Mitigated by two places, repair on read, never overwriting a damaged copy, and Stage 3's rule that plaintext stays until the sealed copy is verified and a recovery has been shown. It still needs the recoverable copy described in `STAGE3_READINESS.md` before anything is sealed.
2. **A stale copy of the account's wrapped keys.** After a password change elsewhere, this device's vault opens with the old password until it next refreshes (it does at each sign-in and when passkeys change; online).
3. **Anything running in an unlocked page can use the key** (a malicious extension, an injected script): the key cannot be copied out but can be used. Any page of the origin can also ask for it over the channel. This is the stated limit of the design.
4. **Key passing is unverified in Firefox and Safari.** The fallback is a second unlock in that page; it does not weaken anything.
5. **Cost of opening everything** (section 6) and **storage growth** (1.44x) shape Stage 3.
6. **The format is version 1 and unreviewed by anyone but the author until the owner reviews it.** It is versioned so a later change can be read alongside it.
7. **Dormant code is still code:** every page now opens one `BroadcastChannel` and reads two small stored copies at start. With no vault, nothing is created and nothing is shown.

## 8. What it does not do

It does not create a vault, seal or move any record, delete any plaintext, change authentication, add a password or PIN, add a server function or migration, or add a native dependency. People with no account have no vault (postponed, as agreed). Sign-out still leaves records readable until Stage 3.
