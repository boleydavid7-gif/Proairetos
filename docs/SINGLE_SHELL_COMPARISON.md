# Single-shell architecture comparison

Status: investigation, for review. **Nothing is consolidated.** Standalone URLs and installs stay. After the
registry and the iPhone diagnostic, the next step proposed is a small prototype behind a feature flag, reported before
any recommendation to migrate.

## Today

Seventeen entry points built by one `vite build` (`rollupOptions.input`, from the manifest). Each app has its own
page, web manifest, icons, service worker scope (Theoria and the retired Praxis use the root worker), tab bar and start-up
(`startApp` or its own). Proairetos reads the others from browser storage and sync. On iPhone a Home Screen app may have
its own storage, so apps installed separately may not see each other's data (the diagnostic measures this).

## The three shapes

**A. Status quo (many apps, many installs).** Each app installs on its own. Strongest independence, simplest deploy
reasoning per app, and each app opens fast with a small first chunk (about 0.8–1.3 s first paint measured). Costs:
data bridges between installs depend on the diagnostic's result; every install repeats worker, sync and account
start-up; notices go through one root worker that other installs may not share.

**B. One shell (everything in the Proairetos install).** The Store's apps become routes inside one installed app,
loaded on demand. Data, sync, account, search and notices live in one storage and one worker, so the isolation problem
disappears for the person who uses only that install. Costs: one service worker and cache for everything (update and
cache bugs reach all apps at once), a larger risk surface per release, deep links and shortcuts must keep each app's
URL working, per-app display mode and manifest (name, icon, theme color) no longer differ, and the five-destination dock
would have to host seventeen apps' navigation (not changed in Phase 2).

**C. Hybrid (shell hosts, apps stay addressable).** The shell loads an app's module in place, while each app's URL
and install still work on their own and open the same module. The person may install the shell only, an app only, or
both. Costs: both paths must be tested; storage can split when someone installs both on iPhone.

## Criteria

| Criterion | A. Many installs | B. One shell | C. Hybrid |
| --- | --- | --- | --- |
| iPhone install and display mode | One icon per app; each its own mode | One icon; one mode | Either |
| Storage and account | Possibly isolated per install (diagnostic) | One storage | One per install used |
| Service workers | One per app scope | One for the origin | Both |
| Offline | Per app, each shell cached separately | One cache holds everything or loads on demand | Both |
| Switching between apps | A new window, a new start-up | In-process, no reload | In-process in the shell |
| Deep links and shortcuts | Already per app | Must be preserved as routes | Preserved by design |
| Standalone URLs | Kept | At risk (must be redirects or routes) | Kept |
| Independent deployment and rollback | Per app in principle (one build in practice) | All at once | Mixed |
| First load | Small per app | Shell plus route chunk | Either |
| Blast radius of a bad release | One app | Everything | Depends on the path |
| UX consistency | Shared design system, separate shells | One shell | Mostly one |
| Cost of change | None | High: routing, styling scope, worker, storage migration | Highest in testing |

## What the diagnostic decides

- If installs are **isolated**, A leaves the person with several data silos unless they use only one install, which
  strengthens B or C for people who add many apps.
- If installs **share** storage, A already works as designed and B's main benefit shrinks to switching speed.
- Either way, sync remains the guarantee.

## Findings that bear on it now

- The manifest makes every shape cheaper: one list drives entries, workers, checks and front pages.
- Start-up weight is a budget already: each app's first chunk must not pull in others' code, and Proairetos's first
  paint is already at the budget's edge (see outstanding issues). A shell would add chunks to that path.
- Ktema, Soma and others depend on a worker per scope for offline; merging them changes cache names, update paths
  and the `?open=` handling (`public/<app>/sw.js`, `notify` placement rules).

## Proposal (not started)

1. Run the diagnostic (owner) and record the four results.
2. Prototype B-lite behind a feature flag: one Store app (Meletē, the smallest) mounted as a route in the Proairetos
   install while its own URL and install stay unchanged. Measure first paint, offline, deep link, notices and update
   behavior against the standalone version.
3. Report. Recommend migration, hybrid or status quo only after that report and the owner's approval.

Out of scope here: moving any app, changing navigation, or deprecating any URL.
