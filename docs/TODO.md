# To do (owner)

Things only you can do: server setup, phone checks, and choices. The code for each is already in.

## Server (Supabase and Cloudflare)

Skip any you have already done. Until a migration is run, the apps keep that data on the device and work as usual.

- [ ] Migration `20261016000000_preferences_files_sync.sql`: settings and photos sync.
- [ ] Migration `20261017000000_reminder_sources.sql`, then redeploy `send-reminders`: reminders from every app.
- [ ] Migration `20261022000000_reminder_previews.sql`, then redeploy `send-reminders`: when lock-screen details are on,
      iPhone notifications can carry the app name, icon and actual reminder line. Without it, each app's words still
      arrive sealed and the phone shows them; the redeploy is needed either way, since the older function sent plain pushes.
- [ ] Strava for Askesis: at https://www.strava.com/settings/api create an app (Website https://proairetos.com,
      Authorization Callback Domain `proairetos.com`), then in Cloudflare > the proairetos Worker > Settings > Variables and
      Secrets add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` (both as Secrets). A new Strava app connects only its owner
      until Strava approves more athletes (request it in the same settings page when others use it).
- [ ] Migration `20261023000000_passkey_first.sql`: new accounts can set up with a passkey and no passphrase.
- [ ] Migration `20261018000000_shared_lists.sql`: Soma's shared grocery list, Ergon's household, Phyton's shared plants.
- [ ] Migration `20261019000000_sign_in_handoff.sql` and the `sign-in-handoff` function: "Sign in other apps".
- [ ] Migration `20261020000000_passkeys.sql` and the `passkey-sign-in` function (one file, named exactly that, Verify JWT off): passkeys
      (steps in `docs/SERVER_SETUP.md`).
- [ ] Redeploy `send-reminders` again: its reply now lists any push a phone's service refused, and why (`refused` in `net._http_response`).
- [ ] Redeploy `send-reminders` (it now also sends a Declarative Web Push for iPhones). Optional secret `SITE_URL` if
      the site is ever not https://proairetos.com.
- [ ] Your own storage, reusing Noesis's registrations: migration `20261021000000_storage_links.sql`; add
      `https://proairetos.com/storage-connected/` as a redirect address in Noesis's Google client, Dropbox app and
      Microsoft registration (Single-page application); add `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET`
      to the proairetos Worker as secrets (steps in `docs/SERVER_SETUP.md`, "Your own storage").
- [ ] Calendar subscription: its migration and the `calendar-feed` function (download a file already works without them).
- [ ] Phyton photo identification: a free key from my.plantnet.org, added as the Cloudflare Worker secret `PLANTNET_KEY`
      (steps in `docs/SERVER_SETUP.md`). Free plan: 500 a day, non-commercial.

## On a real phone

- [ ] Reminders arrive with the apps closed, and a tap opens the right app.
- [ ] New icons: an app already on the iPhone Home Screen keeps its old icon until it is removed and added again
  (back up first if that app is signed out; signed-in apps sync back). Android picks them up by itself over a few days.
- [ ] Your own storage: connect one, check every app follows (another device, an iPhone Home Screen app), then move
      back, once on your own account (tested so far with a stand-in folder, not the real providers).
- [ ] Swipe gestures: edge swipe back, pulling a row to mark it.
- [ ] Fonts, and the sign-in emails.
- [ ] Phyton: identify a real plant once the key is in (so far tested only with a stand-in answer).
- [ ] Change passphrase (Account) and "Forgot your passphrase?" with the recovery key, once on your own account.
- [ ] Passkeys: in Proairetos, Account > Add a passkey; then in another Home Screen app, Sign in with a passkey
      (one Face ID should sign in and open your data).
- [ ] iPhone reminders after both reminder migrations and the redeploy: turn on Details on the lock screen, close every
      app, and wait for a reminder from Hydros or Askesis.
- [ ] Diaita on a phone: try Wind down and Can’t sleep with the screen dimmed or locked, and check the bell, sound and spoken cues.
- [ ] Hydros on a phone: add two custom drinks from Today and check both remain in History for quick selection.
- [ ] Device-only exports on a phone: save an Askesis song archive, Ktema files, a Phyton plant photo archive and a Philia person photo archive, then open each ZIP elsewhere.
- [ ] Device-only restore on a phone: bring each of those archives back into its matching song list, thing, plant and person.
- [ ] Read from a photo: a real medicine box (Therapeia, Add a medicine > Read the label), an appliance plate
      (Ktema), a paper bill (Oikonomia). The first use downloads about 7 MB.
- [ ] Android only, if you have one: Scan a barcode (Soma groceries), From contacts (Philia), Write to an NFC tag
      (a plant, chore or upkeep page; tags are cheap NTAG215 stickers). On iPhone the tag opens Safari, not the
      Home Screen app.
- [ ] On a computer (Chrome or Edge, apps installed): right-click a .ics / bank .csv / .gpx / .pdf, Open with, and
      pick the app.
- [ ] Soma Cook mode with "Say next or timer" on, and Dynamis with "Say done", on your iPhone (Safari asks once for the
      microphone).
- [ ] Restore a new backup file (it now ends in .json.gz) once, to see it come back.
- [ ] On a computer with Chrome: Praxis Float the timer; a recipe in another language shows Translate.
- [ ] iPhone: Gentle taps on (Settings > Appearance), tick something and flip a switch: a light tap (iOS 18+).
- [ ] Once passkeys are set up: tap the email field on a signed-out app; your passkey shows above the keyboard.
- [ ] Android, if you have one: share a photo into Ktema and Therapeia, a PDF into Theoria.
- [ ] From your apps on Today: tick a plant, chore and dose, and see it marked in the app itself.

## To look over

- [ ] Phyton's pet toxicity list (`src/phyton/core/species.ts`): spot-check a few against the ASPCA list
      (aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants).

## Later, by choice

- [ ] Store stage 2: payment and server checks of added apps (all free for now).
- [ ] Phone apps (on hold): native projects, native reminders, widgets (`docs/NATIVE.md`).
