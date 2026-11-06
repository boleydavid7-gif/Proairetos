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
