# To do (owner)

Things only you can do: server setup, phone checks, and choices. The code for each is already in.

## Server (Supabase and Cloudflare)

Skip any you have already done. Until a migration is run, the apps keep that data on the device and work as usual.

- [ ] Migration `20261016000000_preferences_files_sync.sql`: settings and photos sync.
- [ ] Migration `20261017000000_reminder_sources.sql`, then redeploy `send-reminders`: reminders from every app.
- [ ] Migration `20261018000000_shared_lists.sql`: Soma's shared grocery list, Ergon's household, Phyton's shared plants.
- [ ] Migration `20261019000000_sign_in_handoff.sql` and the `sign-in-handoff` function: "Sign in other apps".
- [ ] Migration `20261020000000_passkeys.sql` and the `passkey-sign-in` function (JWT verification off): passkeys
      (steps in `docs/SERVER_SETUP.md`).
- [ ] Calendar subscription: its migration and the `calendar-feed` function (download a file already works without them).
- [ ] Phyton photo identification: a free key from my.plantnet.org, added as the Cloudflare Worker secret `PLANTNET_KEY`
      (steps in `docs/SERVER_SETUP.md`). Free plan: 500 a day, non-commercial.

## On a real phone

- [ ] Reminders arrive with the apps closed, and a tap opens the right app.
- [ ] Swipe gestures: edge swipe back, pulling a row to mark it.
- [ ] Fonts, and the sign-in emails.
- [ ] Phyton: identify a real plant once the key is in (so far tested only with a stand-in answer).
- [ ] Change passphrase (Account) and "Forgot your passphrase?" with the recovery key, once on your own account.
- [ ] Passkeys: in Proairetos, Account > Add a passkey; then in another Home Screen app, Sign in with a passkey
      (one Face ID should sign in and open your data).
- [ ] From your apps on Today: tick a plant, chore and dose, and see it marked in the app itself.

## To look over

- [ ] Phyton's pet toxicity list (`src/phyton/core/species.ts`): spot-check a few against the ASPCA list
      (aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants).

## Later, by choice

- [ ] Store stage 2: payment and server checks of added apps (all free for now).
- [ ] Phone apps (on hold): native projects, native reminders, widgets (`docs/NATIVE.md`).
