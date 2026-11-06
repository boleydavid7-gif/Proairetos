# Stage 3 readiness: sealing the local records

What the foundation gives Stage 3, what is still missing, and the rules Stage 3 follows. Nothing here is built. No migration, backup or recovery behavior changes until the owner approves Stage 3.

## 1. What is ready

| Need | Provided by |
| --- | --- |
| A key that is gone at sign-out and comes back with the account password, a passkey or the recovery key, offline | the vault and the service |
| One interface for sealed and plain values, readable in both forms | `SecureRecordStore` |
| Every app behind one gate, and one place to lock | `SecurityGate` in the shared error boundary |
| The session joined to the vault | `syncController` |
| An inventory of where the data is | `LOCAL_DATA_INVENTORY.md` |

## 2. What Stage 3 still has to build

1. **Backends** for each kind of store: an IndexedDB backend (per store), a browser-storage backend with a synchronous in-memory mirror for `collection`, `stored` and `readRecords`, and file stores (chunked for large books and photos).
2. **Readers first.** Every reader of a store, including the providers (search, Home, Calendar, notices, Library) and the other apps' `readRecords`, goes through the service; only then is that store sealed. Order by app group; `apps:check` gains a rule that new private keys use the facade.
3. **A binary sealed form** for IndexedDB (no base64): the foundation measured 1.44x growth and a decode cost that dominates; a binary form removes most of both. It is a format decision for review before Stage 3 starts.
4. **On-demand opening**, per store and per screen, never everything at unlock (17,000 records take 1 to 8 s on desktop to a slowed phone CPU; a screen needs hundreds).
5. **A notice cache while locked:** the worker shows the app's name and the time only (the existing private form); sealed push payloads show the generic line.
6. **A header safety net** (section 5).
7. **Refresh the cached account envelopes at every successful sync**, not only when the account key is opened or passkeys change, so an old password stops opening a device's vault soon after it comes online (`STAGE2_FOUNDATION.md`, cached password wraps).
8. **The fail-closed gate** shows "cannot be checked" where storage is blocked; decide whether that is acceptable for every browser the apps support before any store is sealed.

## 3. Migration requirements (the owner's conditions, restated as rules)

- **Two releases per sealing step, the K0/K1 way:** a build that *reads* both forms ships and runs at least seven days; only then the build that *writes* sealed. A revert of the second lands on a build that still reads both.
- **Per store, a journaled state machine, resumable after a crash or a closed tab:** plaintext → dual write (every write goes to both; existing rows are copied sealed in small batches) → verified (each sealed row is opened and compared with its plaintext by hash; counts equal) → sealed (reads and writes use the sealed form) → plaintext removed.
- **A sealed safety copy of everything exists before any store starts.** A store whose verification fails keeps its plaintext and stops with a message; nothing is removed until its sealed twin opens.
- **Removing plaintext of a verified store needs the owner's explicit approval for each pass.** It replaces the plaintext; it is not deleting a record. The rule stands that plaintext is never removed until the encrypted copy is verified and recoverability is shown.
- **Each store is its own pull request** with tests, a rollback and the owner's approval; no all-at-once migration.
- **Each iPhone Home Screen app migrates its own storage** (separate partitions).
- **Account switching** keeps today's rule: the previous account's data is put away (sealed) and the new account starts clean.

## 4. Backup requirements

- **Save a backup file / readable copy:** read through the service, so they need the vault unlocked; they write the same plain or password-encrypted file as today (a person's explicit export of their own data). The file never contains the LVK or the header.
- **Daily copies and put-away account backups** become sealed under the LVK (K in the inventory) and restore only while unlocked.
- **Restore** from a file onto a device with no vault creates a vault and seals what it restores; onto a device with a vault, asks for the unlock first. Older plaintext backups still restore.
- **The safety copy** (section 3) is a normal backup file, encrypted with the account's recovery key or a password the person chooses, and offered for the person to keep. Without one, a lost header means lost sealed data.
- **The error page's "Save a copy first"** must work while locked or say plainly that it needs the unlock.

## 5. Recovery procedures

| Situation | Procedure |
| --- | --- |
| Forgot the password | the recovery key opens the account key and so the vault; set a new password (rewraps the account key; nothing re-sealed) |
| Lost the recovery key, remember the password | the password opens everything; make a new recovery key |
| Forgot both | synced data and sealed local data cannot be opened (as already true of synced data); the person's last readable export or safety copy is the way out, which is why Stage 3 offers one before sealing |
| One copy of the header damaged or lost | repaired from the other at the next start (built) |
| Both copies lost | the LVK is gone and sealed local data cannot be read; recovery is from the safety copy or a backup file; synced records come back from the account on a device that has the account key. **To reduce the risk, Stage 3 should also keep the LVK's wrap in the person's own synced data** (an encrypted device record through the existing preferences sync, no migration), so the account can restore it; this is a design question for review |
| Lost or stolen device | sign out everywhere or revoke the device from another one (Stage 1); the sealed data on the lost device stays sealed unless the thief has the password; an access token already issued works for up to an hour (measured) |
| A new device | sign in; the account key opens; sync brings the records; the device makes its own LVK (nothing sealed under another device's LVK is ever copied) |
| An interrupted migration | resumes from the journal; plaintext is untouched until verified |

## 6. Open decisions for the owner before Stage 3

1. Review the version 1 header and sealed value format in `STAGE2_FOUNDATION.md`, including the binary form for IndexedDB.
2. Argon2id: when, as its own release (recommended), and the parameters.
3. Whether to keep an account-synced wrap of the LVK as a recovery for a lost header.
4. The order of stores and apps.
5. The limit for browser-storage records (5 to 10 MB) with 1.44x growth, or moving the largest into IndexedDB.
6. What the person sees while locked besides the locked screen (notices: the app's name and time only).
7. Firefox, Safari and iPhone checks for passing the key between pages, before Stage 3 relies on it.

## 7. Checklist before Stage 3 may start

- [ ] Format reviewed and approved; Argon2id decision made.
- [ ] A reading build of every sealed form has run for at least seven days in production.
- [ ] The safety copy and the restore have been shown to work on the owner's own data.
- [ ] Firefox, Safari and a phone checked for the key hand-over and the locked screen.
- [ ] The first store chosen, with its readers listed from `LOCAL_DATA_INVENTORY.md`.
