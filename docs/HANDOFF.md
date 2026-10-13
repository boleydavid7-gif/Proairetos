# Handoff: Proairetos family of apps

Paste this to a new assistant to pick up where the last one stopped.

## What it is

- **Repo:** GitHub `boleydavid7-gif/proairetos`.
- **Branches:** work on `claude/redesign-headers`; `main` deploys.
- **Site:** https://proairetos.com.
- **Hosting:** a Cloudflare Worker serves static assets. Pushing to `main` deploys.
- **What it is:** fourteen installable web apps (PWAs) built with React 19, Vite and TypeScript, local-first, with optional end-to-end encrypted sync through Supabase.
  - The main app is Proairetos: organizer, Stoic reflection, mindfulness.
  - The add-ons, each at `/<name>/`:
    - Askesis (running)
    - Soma (recipes)
    - Oikonomia (bills)
    - Hydros (water)
    - Praxis (study timer)
    - Theoria (reading)
    - Diaita (sleep rhythm)
    - Philia (people)
    - Ergon (chores)
    - Therapeia (medicines)
    - Dynamis (strength)
    - Ktema (belongings)
    - Phyton (plants)
- **Noesis:** a separate reader app in its own repo, at `noesis.proairetos.com`.

## Read first

`CLAUDE.md` in the repo root is the full map: every feature, file and rule. `docs/PRODUCT_ARCHITECTURE.md` explains why things are the way they are. The owner's open to-dos are in `docs/TODO.md`, and the server steps are in `docs/SERVER_SETUP.md`.

## Rules that must hold

- **Banned words** in any source file, comments included: overdue, failed, stalled, lazy, avoiding, behind, should. A test enforces this. Reword rather than disable it.
- **No scores, streaks, rewards, failure states or shame language.** Deleting anything offers undo. Every screen can be left (Cancel, swipe down, back).
- **The app records and never interprets.** No inferred mood, no ranking of priorities, no advice nobody asked for.
- **Wording is short and functional**, in the style of Things or Apple Reminders:
  - Optional fields say "(optional)".
  - Titles are names with no full stop.
  - No reassurance lines.
  - No "quietly" or "gently".
- **Before every push**, run all of these and push only if they pass:
  - `npm run check` (lint, typecheck and tests)
  - `TZ=Pacific/Auckland npx vitest run`
  - `TZ=America/Los_Angeles npx vitest run`
  - `npm run build`
  - `npx wrangler deploy --dry-run`
- **Push to both** the branch and `main`.
- **After shipping**, add a line to `src/app/whatsNew.ts`, update `CLAUDE.md`, and update `docs/TODO.md` if the owner has a step to do.
- **Security:** never put the Supabase service role key or the VAPID private key in the repo or in Cloudflare variables.

## Recently done (last session)

- **Icons:** redrawn for all fourteen apps (`scripts/icons/`). In-app marks now match the icons (`app/family/marks.tsx`).
- **Design passes against "AI-made" tells:**
  - Sentence-case labels and solid cards instead of glass.
  - One serif rule: the serif is only for titles, quotes and the person's own words.
  - Shorter home banners.
  - Empty home screens are now one line with a small button (`.card.first-run`).
  - The daily quote is smaller and shows only once there's content.
  - Only Proairetos greets the person.
- **Notifications:**
  - The server sends correctly.
  - The owner's phone had notifications switched off, which explained why nothing arrived.
  - The app now re-subscribes if the phone drops its subscription (`keepPushSubscription`).
  - The push handler always shows something.
- **Passkeys:**
  - iPhones give the passkey's secret only when the passkey is used, so a second "Continue" tap was added.
  - "Let it open your data" in Settings → Account fixes a passkey that only signs in.
  - With a working passkey, unlock leads with Face ID, and the copy-a-sign-in-pass step hides.
  - Not yet confirmed working on the owner's iPhone. The owner's existing passkey still showed "signs in only".
- **Bring your own storage** (Google Drive, Dropbox, OneDrive):
  - `src/data/sync/folderRemote.ts`: per-device log files, newest write wins.
  - `storageProviders.ts`, `storageLink.ts`, `app/sync/ownStorage.ts`, `worker/storageToken.ts`, `features/settings/StorageChoice.tsx`.
  - Migration `supabase/migrations/20261021000000_storage_links.sql`.
  - It reuses Noesis's Dropbox and OneDrive registrations; their IDs are in `wrangler.jsonc` vars.
  - Google gets its own OAuth client. Its ID and secret go into the proairetos Worker as `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET`.
  - The return address for all three is `https://proairetos.com/storage-connected/`.

## Owner's steps still open (storage)

1. Run `20261021000000_storage_links.sql` in Proairetos's Supabase SQL Editor.
2. **Google Cloud:** create a new OAuth client (Web application) named Proairetos, with redirect URI `https://proairetos.com/storage-connected/`. Copy its Client ID and secret into the proairetos Worker as Secrets.
3. **Dropbox:** in Noesis's app, under Settings → Redirect URIs, add the same address.
4. **Microsoft Entra:** in Noesis's app, under Authentication → Single-page application → Add URI, add the same address.
5. **Check:** https://proairetos.com/api/storage should list google, dropbox and onedrive.

## Next work (the rest of the third design pass)

1. **Askesis setup** ("Where you are now", `src/askesis/screens/PlanPage.tsx`): ten stacked choice cards per question. Make each question one grouped list with a check mark, iOS style.
2. **Praxis** (`src/praxis/PraxisApp.tsx`, `views.tsx`):
   - Remove the tiny "Proairetos" label and the stray dot at the top.
   - With no block, don't show a 25:00 timer with an active Start; show "Add a block" instead.
   - The phone bar has 7 items; consider fewer.
3. **Therapeia "Add a medicine"**: the time field is cut off ("08:00 A"). Widen it in that form's CSS.
4. **Check the result:** take phone-size screenshots of every app's first screen in dark and light, using Playwright with Chromium at `/opt/pw-browsers/chromium` against `npm run build` plus `npx vite preview`.
5. **Optional:** Ktema's and Theoria's device-only files could sync through the person's own storage.
