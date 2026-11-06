# Where user data lives on the device

Taken from the code at the Stage 2 foundation (`main` plus this branch). Everything here is **plaintext today**; nothing is sealed. "Seam" is where the code reads and writes it, which is where sealing goes in Stage 3. Class: **P** private records, **C** credentials or device secrets, **K** copies, **N** not private (leave readable).

## 1. IndexedDB database `proairetos` (version 8; 31 stores)

| Stores | Owner | Class | Seam |
| --- | --- | --- | --- |
| `lifeItems`, `itemEvents`, `reflections`, `values`, `statements`, `decisions` | Proairetos | P | repositories behind interfaces (`src/data/storage/indexeddb/*`, in-memory twins) |
| `schedulePatterns`, `scheduleExceptions` | Proairetos (schedule) | P | same |
| `attachments` | Proairetos (item files, base64) | P | same |
| `askesisWorkouts`, `askesisPlans` | Askesis | P | same |
| `somaRecipes`, `somaGroceries` | Soma | P | same |
| `oikonomiaBills`, `oikonomiaBudgets`, `oikonomiaEnvelopes` | Oikonomia | P | same |
| `poreiaTrips`, `poreiaPlaces`, `poreiaWorkProfiles`, `poreiaPtoAccounts`, `poreiaPtoLedger`, `poreiaLeaveRequests`, `poreiaVacations`, `poreiaItineraryItems`, `poreiaBookings`, `poreiaSavingsPlans` | Poreia (older store set) | P | same |
| `hydrosDrinks` | Hydros | P | same |
| `theoriaBooks`, `theoriaNotebooks` | Theoria | P | same |
| `syncState`, `syncMeta` | sync | C (`syncMeta` holds the account data key, the handoff key copy, the reminder subscription endpoint) | `localStores.ts`; cleared at sign-out |

## 2. Other IndexedDB databases

| Database | Holds | Class |
| --- | --- | --- |
| `proairetos-daily` | seven daily full-backup copies (plain JSON text) | K |
| `proairetos-accounts` | a previous account's data put away when another account signs in (plain backup text) | K |
| `proairetos-folder` | handles to the person's backup and library folders | C |
| `proairetos-vault` | the vault header's second copy (new; empty until a vault exists) | not private (sealed key, wrapped keys) |
| `theoria-files` | book texts, files, covers | P |
| `ktema-files` | photos and files of things | P |
| `philia-photos`, `phyton-photos`, `poreia-files` | photos, trip documents | P |
| `askesis-music` | songs the person added | P |
| `askesis` | the first version's database, moved once and removed | P (legacy) |

## 3. Browser storage (localStorage): about 113 distinct keys, 226 call sites in 72 files

| Group | Keys (examples) | Class | Seam |
| --- | --- | --- | --- |
| Records, one key each, through `collection()` (33 prefixes) | `ergon:chore:`, `ktema:thing:`, `ktema:upkeep:`, `philia:person:`, `phyton:plant:`, `therapeia:medicine:`, `therapeia:visit:`, `therapeia:reading:`, `diaita:sleep:`, `diaita:worry:`, `dynamis:workout:`, `dynamis:mobility:`, `melete:subject:`, `melete:session:`, `mneme:note:`, `mneme:idea:`, `mneme:collection:`, `poreia:trip:`, `poreia:booking:`, `poreia:plan:`, `poreia:pack:`, `poreia:spend:`, `poreia:spot:`, `poreia:doc:`, `poreia:journal:`, `poreia:mail:`, `poreia:off:`, `proairetos:pursuit:` and others | P | `src/app/family/shell.tsx` `collection`; read across apps by `storedRecords.ts` `readRecords` (synchronous) |
| Settings through `stored()` (14) | `<app>:settings`, `diaita:experiment`, `dynamisDraft` (a workout in progress) | P (settings) | `shell.tsx` `stored` |
| The person's settings, `proairetos.*` (55) | `proairetos.displayName`, `.lock` (passcode hash), `.health`, `.todayLayout`, `.household`, `.together`, `.calendarFeed` (the link choice), `.captureInbox` (inbox token and private key), `.otherCalendars` and each calendar's cached events, ... | P and C (see next row) | `data/storage/preferences.ts` and many direct reads |
| Device-only, `proairetos*` camel case (13) | `proairetosAccount`, `proairetosOwned`, `proairetosStore`, `proairetosInboxSeen`, `proairetosInboxCleared`, `proairetosHouseholdInvites`, `proairetosSignOutNote`, `proairetosVault`, `proairetosHealthKey` (health inbox token and private key), ... | mostly N; `proairetosHealthKey` C | direct |
| Credentials and shared keys | `proairetos.auth` (the session), `askesis:strava` (Strava tokens), `theoriaCloud.<provider>` (cloud library tokens), `proairetosTogether`, `proairetosHousehold`, `somaShared`, `ergonShared`, `phytonShared`, `poreiaShared`, `ktemaShared`, `therapeiaShared`, `oikonomiaShared` (shared-list keys, caches of shared items) | C | direct; the session is Supabase's |
| Not private | appearance, text size, `proairetos.appearance`, day-light cache | N | direct |

Other apps' records are also read by Proairetos through `readRecords(prefix)` and by the Phase 3 providers (search, Home, Calendar, notices, Library), which is why a store can be sealed only when every reader of it goes through the service.

## 4. Cache Storage and workers (15 service workers)

| Cache | Holds | Class |
| --- | --- | --- |
| `proairetos-notify` | the words of the next 14 days of notices (names; until K1, a dose in the key) and the app-icon badge state | P |
| `proairetos-share-inbox` | files shared into the app | P |
| `proairetos-phyton-outside` | place and plant names for frost checks | P |
| `proairetos-sounds`, `poreia-map` (map tiles), `<app>-vN` shells | static or public content | N |
| Worker reads from IndexedDB `proairetos`/`syncMeta` | the account data key, to open sealed pushes | C |

## 5. Memory and sessionStorage

Decrypted records live in React state, the providers' in-memory stores (search, Home, Calendar, Library: derived, never stored) and the sync engine. No `sessionStorage` keys are used for data. The account key, the local vault key and any password held for key setup are in memory only; sign-out clears them (Stage 1 and 2).

## 6. Backups and files that leave the device

`Save a backup file` and the daily copies are plain JSON (a password is optional for the saved file); `readable copy` (Markdown); calendar `.ics` files; the published calendar file on the server. These are copies and exports, covered in `STAGE3_READINESS.md`.

## 7. Counts for planning

31 IndexedDB stores in the main database; 10 other databases; about 33 record prefixes and 14 settings keys in browser storage; about 55 settings and 13 device-only keys; 8 groups of credential keys; 15 workers and about 21 caches. Roughly **70 private stores or key families** to bring behind the service, plus the copies.
