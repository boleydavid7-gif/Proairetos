# Proposal: notice keys without words

Status: proposal for review. Nothing is implemented. The legacy notice gather stays in place for rollback throughout.

## 1. The issue

A notice's key is its identity. It is the notification's tag, the entry in the worker's list of notices already shown, the
entry in the notifications page's seen and cleared lists, the `k` field of the sealed words, the input of the phone shell's
numeric id, and the input of the server row's id (`SHA-256(key:time)`, first 16 bytes). Four apps put words into their keys:

| Key | What it contains |
| --- | --- |
| `therapeia:dose:<ms>:<name, dose>` (cut at 60 characters) | Medicine names and dose amounts |
| `ktema:<day>:<names>` (cut at 80) | Upkeep names |
| `ergon:<day>:<time>:<names>` (cut at 80) | Chore names |
| `phyton:<day>:<plants to check / plants to feed>` (cut at 80) | Plant names |

The other keys hold random record ids, dates and times (Philia, Poreia, Meletē, Oikonomia, Dynamis, Diaita, Askesis, and the
rest of Therapeia and Ktema), which say nothing.

Where those four keys can be read today, regardless of the lock-screen setting:

1. **The server, by guessing.** The row id is an unsalted SHA-256 of `key:time`, and the fire time is stored in the clear. Anyone
   who can read the `reminders` table can hash candidate keys ("a dose of Amoxicillin, 500 mg at this time") and test whether
   the account has one. The sealed words stay sealed; the row id is the weak point. This is the finding to fix first. The
   earlier statement that a hashed id protects the key was true only for keys that cannot be guessed.
2. **This device's browser storage.** `proairetos-notify` (Cache Storage: the upcoming list and the shown list) and the inbox's
   seen and cleared lists in `localStorage` (`proairetosInboxSeen`, `proairetosInboxCleared`) hold keys as they are. Same-origin
   only, but it includes the case where the lock screen is private and the person expects nothing readable.
3. **Sealed words and the phone shell.** `k` is sealed with the account key. The phone shell's numeric id is a 32-bit hash. Neither
   is a readable leak.

The words of a notice (title, body, preview) are not affected and are protected as decided.

## 2. Options

| Option | How | Verdict |
| --- | --- | --- |
| A. Record ids in the key (recommended) | The four producers build the key from the ids of the records (`therapeia:dose:<ms>:<medicine ids>`) instead of their names. Ids are random and already synced, so every install computes the same key, and a hash of an id-based key cannot be guessed. | Smallest change; needs no secret; fixes all three places. |
| B. A keyed hash at the boundary | Every key becomes `HMAC(account secret, key)` where the notice leaves the gatherer. | Needs a synced account secret (a device-only one breaks the tag a push sealed by another device uses), a first-sign-in rule, and a backup rule. More machinery for the same result. |
| C. Fix only the server id | Row id becomes an HMAC; device keys stay as they are. | Closes the guessing risk only, and still needs a secret. Partial. |

Recommendation: **A**, in the three phases of section 3. It also makes a renamed record keep its notification identity, where
today a rename changes the key and can bring a second notice for the same thing.

## 3. Migration without duplicates or lost reminders

The method is expand, switch, contract, with the old key carried as an alias while both can exist.

**K0. Expand (no key changes).**

- `Notice` gains an optional `also: readonly string[]`: earlier keys for the same notice. The producers do not set it yet.
- Every place that asks "was this shown or cleared" asks for the key or any alias:
  `shown` and `catchUp` in `notifications.ts`, `public/sw.js` (`shown.has`), the inbox's seen and cleared sets, and the sealed
  words (`wordsOf` adds an optional `a`, which the worker reads).
- `public/sw.js` changes, so its cache name is bumped and it is released first. Rows already on the server and notifications
  already shown keep working: with no `also`, nothing is different.
- Tests: an alias in the shown list suppresses the same moment under a new key; a cleared entry stays cleared under a new key; a
  worker without `a` still shows the notice once.

**K1. Switch the four producers.**

- Each of the four builds the new id-based key and sets `also: [oldKey]` (the old function stays, as `legacyKey`). The old key is
  computed from the same inputs, so for one release both exist for the same notice.
- Because delivery runs from `Notice[]`, everything follows by itself: the notification tag, the cache, the inbox, the sealed
  `k`, the phone shell id, and the server row id.
- What happens to what is already pending:
  - **Server rows:** `replaceSourceReminders` already deletes the source's future unsent rows and inserts the new list on every
    refresh. The first refresh after the update replaces old-id rows with new-id rows for the same times. A row whose time has
    come stays until the server's next run (the rule from `dueRowsKept`), and the new list starts from now, so it is not sent
    twice.
  - **Phone shell:** `scheduleNative` cancels the ids it kept in `localStorage` before scheduling, so the old numeric ids are
    cancelled and the new ones scheduled.
  - **Notifications already shown:** their old tag is in the shown list; the new notice carries it as an alias, so catch-up and
    the worker do not show them again.
  - **Inbox:** entries cleared or seen under the old key stay cleared or seen, through the alias.
  - **A device that has not updated:** it keeps writing old-id rows. Each writer replaces the source's future rows wholesale, so
    only the last writer's set exists at any time and the person gets one notification per moment. A device on the old build may
    write the old, guessable ids until it updates; this is stated in the release note.
- Tests: for each of the four, the new key contains none of the names or doses (a canary in every name and dose field is absent
  from every key, the cache entry, the sealed input and the row id input); old and new keys differ only in these four; the
  times, words, kinds, sources and sets of notices are equal before and after (the baselines, with the keys mapped through
  `also`); a rename keeps the key; the pending set after a refresh equals the pending set before by time.

**K2. Contract.** After at least 21 days (longer than the 14-day horizon, so no pending row or shown entry can still use an old
key) and one worker revision after K1: remove `also` from the four, remove `legacyKey`, keep the alias handling in the consumers
(it costs nothing). A last pass confirms no key in the cache, the inbox lists or the sealed input holds a name.

### Status

- **K0 (written, tests not yet run):** `Notice.also`; `src/core/notify/identity.ts` (`identitiesOf`, `remembers`, `carryOver`); `shown` and `catchUp`
  in `notifications.ts`; the notifications page (seen and cleared sets, the bell's count, pruning, carry-over); `public/sw.js` (`wasShown`,
  with the earlier keys read from the on-device cache, never from the sealed words); `NoticeLine.also` in the contract (up to four other
  keys, none the notice's own, none another notice's key). Nothing sets `also` yet.
  The earlier keys go only into the on-device cache entry. They are not in `wordsOf` (the sealed words), the preview columns, the server
  row id input, the phone shell's payload or any notification text. The worker is stamped with the build time, so it updates with the app.
- **K1 (done, commit `8326e6d1`, on the session branch; not deployed).** The four keys are made of record ids and carry the key they had as
  `also`:

  | App | New key | Earlier key (kept as `also`) |
  | --- | --- | --- |
  | Therapeia dose | `therapeia:dose:<ms>:<medicine ids>` | `therapeia:dose:<ms>:<name, dose>` (cut at 60) |
  | Ktema upkeep | `ktema:<day>:<upkeep ids>` | `ktema:<day>:<names>` (cut at 80) |
  | Ergon chores | `ergon:<day>:<time>:<chore ids>` | `ergon:<day>:<time>:<names>` (cut at 80) |
  | Phyton day notice | `phyton:<day>:<check ids>\|/\|<feed ids>` | `phyton:<day>:<check names>\|/\|<feed names>` (cut at 80) |

  Ids are in plain code-unit order and cut at 80 characters, so every device makes the same key. Warranty, frost, refill and visit
  keys and every other app's keys were already id-based or date-based and are unchanged. The earlier key is in the on-device cache
  only; it is not in the sealed words, the lock-screen words, the preview columns, the server row input, the phone shell's payload or
  any notification text.

  Verified before commit (nothing deployed):

  | Check | Result |
  | --- | --- |
  | `src/tests/notify` (13 files) and `provider.test.ts`, UTC | 14 files, 95 of 95 |
  | The same, America/Los_Angeles | 14 files, 95 of 95 |
  | `therapeia/core/medicines.test.ts` | 18 of 18 |
  | Real page (`scripts/notices-check`, against the Vite dev server) | 18 of 18: keys made of ids, the earlier key on the device, keys and earlier keys identical after a reload, and dose, chore, upkeep and plant entries cleared under the old keys cleared under the new ones after the update and after a reload |
  | TypeScript and lint | clean |

  Not verified: a real push delivery, the phone shell, a worker update window on a real device, a production build.

- **Compatibility risks that remain after K1.**
  1. A device on a build before K0 ignores `also`. Around the update it can show a notification a second time, once.
  2. A device on a build before K1 writes the old, guessable row ids until it updates. The newest writer's set replaces the others, so
     delivery stays single; the old ids are in the server until every device is updated.
  3. Until K2, the on-device cache still holds the earlier key (with names and dose amounts) beside the new key.
  4. `replaceSourceReminders` deletes the future unsent rows before it inserts the new ones. An interrupted refresh leaves the next app
     open or sync to rewrite them. This is existing behavior.
  5. The worker's copy of the identity rule (`wasShown` in `public/sw.js`) is kept equal to `identity.ts` by a test; a worker that
     is not yet updated ignores earlier keys.
  6. Two of the chores or plants that used to share a key (same names) now have two keys, so the set of notices is the same and the
     number of keys can grow. Nothing is shown twice.

- **K2: not started.** It must not start until the checklist below is complete.

## K2 readiness checklist

K2 removes the earlier keys: the four producers stop setting `also`, `legacyKey` computations go, and a last pass confirms no key in
the cache, the inbox lists or the sealed input holds a name. The alias handling in the consumers stays (it costs nothing). Nothing
in K2 starts until every line is checked and you authorize it.

The 21 days start on the day K1 is deployed to production. **K1 is not deployed, so the countdown has not started.** Record the deploy
date here when it happens: `K1 deployed: ______`.

| # | Condition | How it is confirmed |
| --- | --- | --- |
| 1 | At least 21 days since K1 was deployed (longer than the 14-day horizon, so no pending row or shown entry can still use an earlier key) | The recorded deploy date, counted by you |
| 2 | Supported clients have received K0 and K1 | The oldest build still opening against the account's data is K1 or later; for installed apps, the worker has updated (the build stamps `sw.js`, so it follows the app) and the phone shell, if used, has a store version with K1. Count what can be counted (the Worker's `/api` logs, sign-ins by build); say what cannot |
| 3 | No reliance on earlier keys | A search of the code for `also`, `legacyKey` and the old key formats shows only K2's own removals; a canary test over the cache, the inbox lists and the sealed input finds no name or dose |
| 4 | Pending notifications are correct | On a real device with reminders set up: due notices arrive once; the server's `reminders` rows for the four sources all carry new-style ids (no row older than the K1 deploy); a test notice through the server arrives |
| 5 | Cleared and seen states are correct | A cleared entry stays cleared on two devices after K1; the inbox lists on a long-lived device hold the new keys; run the inbox test with the cleared list as it is on that device |
| 6 | Service worker compatibility is confirmed | The deployed `sw.js` has `wasShown`; a worker from before K0 is not still controlling a page (a clients check after the update); `swRouting` and the identity test pass against the deployed `sw.js` |
| 7 | Rollback is documented and ready (below) | This document |

**Rollback implications.**

- Before K2, rollback is safe in both directions. Going back to a build before K1 puts the old keys back; the entries cleared under them
  are still in the cleared list, because pruning keeps an earlier key while any entry carries it, and the new keys already added stay
  beside them. The notice moments are unchanged, so pending rows are replaced with the old ids on the next refresh.
- After K2, going back to a build before K1 cannot rely on the earlier keys. An entry cleared under a new key would reappear on the
  notifications page once under its old key, and a notification shown under a new key could be shown again on a device that rolls
  back. K2 therefore ships as its own commit, with the earlier-key code reverted only in that commit, and the K1 build stays available
  until the first weeks after K2 show nothing unexpected.
- The provider path for notices has its own rollback (`proairetosNoticeProviders` set to `off` on a device, or a build with
  `VITE_NOTICE_PROVIDERS=off`) and is independent of the key migration.

## 4. What this does not change

- Wording, times, quiet hours, switches, sources, delivery, permissions, the lock-screen setting, or sync.
- The server schema. No migration; the id column keeps its type and length.
- The other twelve kinds of key.

## 5. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A notification shown twice around the update | Aliases in `shown`, `catchUp`, the worker and the inbox; K0 released and active before K1. |
| Pending reminders lost if a refresh deletes old rows and then cannot insert the new ones | Existing behavior of `replaceSourceReminders`; every app open and every sync rewrites the list. If wanted, an insert-then-delete order for the switch release only, by listing old ids (needs a read of the source's rows). |
| Older worker or older app in the same account | Old builds keep working on their own rows; wholesale replacement means one set at a time; documented in the release note. |
| Two records with the same name today share a key; ids would make them two | Intended: the notice then names the same set as before; the test compares the sets of notices, not the number of keys. |
| Truncation (60 or 80 characters) hides a change today | Ids are longer; a key is not shown or sent in the clear, so length is not a concern. The sealed `k` is cut at 120 by `wordsOf`; the id-based keys are kept under that. |
| Phone shell id collisions (32-bit) | Unchanged; the existing 60-notice cap makes it negligible. |

## 6. Tests and cost (for authorization when this starts)

| Group | Command | Time |
| --- | --- | --- |
| Key canaries and key-shape tests, parity with key mapping, alias behavior | `npx vitest run src/tests/notify` | a few seconds |
| Row ids and replacement | the same folder (`dueRowsKept`, `olderServer`, a new `rowIds` test) | a few seconds |
| Worker behavior | `swRouting` and a new worker test for `a` | a few seconds |
| Two installs, one updated | `noticesSync` extended | a few seconds |
| One real page, old and new keys across a reload | `scripts/notices-check` extended | about 35 s |
| Types and lint | `npm run typecheck`, `npm run lint` | seconds |

## 7. Decision needed

Approve option A and the K0, K1, K2 sequence, including that K1 waits until K0 has reached installed devices (the worker updates
on the next load) and that K2 waits at least 21 days.
