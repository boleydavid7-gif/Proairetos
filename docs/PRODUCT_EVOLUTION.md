# Product evolution

The weekly cycle (the owner's standing request, Nov 5, 2026): research the field, review the apps, propose a short list,
wait for approval, build what is approved, record it here. Continuous improvement, not constant change: keep what works,
every update has a clear purpose, nothing unrelated, Lamplight and each app's own identity kept, tests and regressions
checked, `CLAUDE.md` and What's new updated when something ships. Do not repeat a recommendation unless something has
materially changed.

Each week: Research (what moved in the field), Proposals (app, update, problem, how, why, competitive relevance,
complexity), then the status lists below.

## Status lists

**Proposed, waiting:** see the latest week.
**Approved / in progress:** none.
**Completed:** none yet.
**Rejected:** none yet.
**Worth revisiting:** none yet.

## Week of Nov 5, 2026

### Research

Search results this week were thin on dated 2026 news; what is below is what held up. Verify against vendor release
notes before relying on any single claim.

- Things 3.22 moved to Liquid Glass with four icon looks (default, dark, tinted, clear); Apple's own Reminders took the
  same look, and iOS 26.1 added a switch for how strong the glass is. Reading: people want a say in how transparent the
  system is. Proairetos already has Room, Color, More contrast and Reduce transparency, so nothing to chase.
- Sunsama's guided morning pass (yesterday's leftovers, new items, durations, drag onto the calendar) and Reclaim's
  automatic scheduling are the two poles of day planning; Sunsama raised its price to about $20 a month. Todoist Pro is
  about $5 a month.
- Web platform: View Transitions and scroll-driven animations are now in all three engines per a 2026 secondary source
  (not confirmed on MDN here; check caniuse before building); Interop 2026 lists both as focus areas.
- Not found: reliable news on Strava, Oura or Apple Health changes, Badging or Safari PWA changes.

### Proposals

1. **Top bar and title fade on CSS scroll timelines** (every app's phone bar, `lamplight/behaviors.ts`, `bars.css`).
   Problem: scrolling still runs JavaScript each frame to fade the title and bring in the bar's glass. How: express the
   fade and glass as `animation-timeline: scroll()` animations, keeping the current JavaScript where the browser lacks
   it. Why: smoother on slow phones, less battery, fewer chances of the bar drifting (a source of earlier iOS bugs).
   Competitive relevance: matches the native feel Things and Reminders have on iOS 26. Complexity: medium (iOS Safari
   needs a real-device check). Confirm support first.
2. **Finish child limits in the screens** (Oikonomia, Poreia, Phyton, Therapeia, Proairetos to-dos). Problem: the device
   already drops a child's forbidden writes, but the controls still show and do nothing. How: use
   `useListPermissions` to hide or disable them, as Soma's list and Ergon already do. Why: a control that does nothing
   is worse than none, and it completes the Family feature. Competitive relevance: Apple Family and Google Family Link
   both hide what a child cannot do. Complexity: medium.
3. **Place several to-dos in open time at once** (Proairetos Today, Open time). Problem: giving each to-do a time is
   one tap per item. How: after choosing the to-dos in Today's list, a preview lays them into the open gaps (the person
   moves or removes any), one Save, one undo; nothing is chosen or ranked by the app. Why: the part of Sunsama people
   value, without its ritual or an AI deciding. Competitive relevance: Sunsama, Reclaim, Motion. Complexity: medium.
   Product-rule check: it only places what the person picked, so it stays "shows and offers".

### Watch list

- Cross-document view transitions and Interop 2026 (already used for app-to-app).
- Strava API terms (still on hold, see Askesis).
- Anything Apple announces for Reminders or Health.

### Status this week

All three proposed, waiting for approval.

### Update log

- Nov 5: proposal 2 (child limits in screens) approved and built: Oikonomia bills and expenses, Poreia trips, Phyton
  plants, Therapeia medicines and Proairetos's shared to-dos hide or disable what a child's level forbids
  (`useAppPermissions`, `SwipeRow off`). Test `src/tests/household/childControls.test.tsx`.
