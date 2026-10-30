# To do (owner)

Things only you can do: server setup, phone checks, and choices. The code for each is already in.

## Server (Supabase and Cloudflare)

Skip any you have already done. Until a migration is run, the apps keep that data on the device and work as usual.

- [x] Theoria books stay on the device or in the person's own connected cloud storage. They are excluded from Proairetos
      cloud sync; only reading progress, highlights, notes and sessions sync.
- [ ] Theoria's library folder (OneDrive, Google Drive, Dropbox), one storage or all three:
      - OneDrive: in Azure > App registrations > the Noesis/Proairetos registration > API permissions, add Microsoft Graph
        delegated `Files.Read` (personal accounts consent at sign-in, so this mostly makes the list honest).
      - Google Drive: in Google Cloud > the same OAuth client's project > Google Auth Platform > Data access, add the scope
        `https://www.googleapis.com/auth/drive.readonly`. It is a restricted scope: until Google verifies the app, keep it in
        Testing with your own account under Test users (sign-ins then last 7 days before connecting again), or publish it
        unverified (a warning screen, at most 100 people).
      - Dropbox: the existing app reaches only its own app folder. For any folder, create a second app at
        https://www.dropbox.com/developers/apps (Scoped access, Full Dropbox), tick `files.metadata.read` and
        `files.content.read`, add the redirect `https://proairetos.com/storage-connected/`, then in Cloudflare > the
        proairetos Worker > Settings > Variables add `DROPBOX_LIBRARY_APP_KEY` (its App key; plain text is fine).
- [ ] Migration `20261016000000_preferences_files_sync.sql`: settings and photos sync.
- [ ] Migration `20261017000000_reminder_sources.sql`, then redeploy `send-reminders`: reminders from every app.
- [ ] Migration `20261022000000_reminder_previews.sql`, then redeploy `send-reminders`: when lock-screen details are on,
      iPhone notifications can carry the app name, icon and actual reminder line. Without it, each app's words still
      arrive sealed and the phone shows them; the redeploy is needed either way, since the older function sent plain pushes.
- [ ] Capture from anywhere: run `20261024000000_capture_inbox.sql`, then in Cloudflare > the proairetos Worker >
      Settings > Variables and Secrets add `SUPABASE_URL` (your project address) and `SUPABASE_ANON_KEY` (the publishable
      key; both are public values, plain text is fine). Then Settings > Capture from anywhere > Turn on, and make the Shortcut.
- [ ] Supabase file storage cleanup: old Theoria book buckets can be removed after checking that any needed books are
      still on devices or in the person's own Drive, Dropbox or OneDrive folder.
- [ ] Apple Health: run `20261028000000_health_inbox.sql` in Supabase (the Worker's `SUPABASE_URL` and `SUPABASE_ANON_KEY`
      are already set for Capture from anywhere). Then Settings > The app > Apple Health > Turn on, and set up Health Auto
      Export as the page says (REST API, JSON). Send a first export with Manual Export and open any app; send Claude a JSON
      export too, so the reading can be checked against the real thing.
- [ ] (Optional, on hold: since June 2026 Strava requires the app owner's paid subscription; the code waits unused until then.) Strava for Askesis: at https://www.strava.com/settings/api create an app (Website https://proairetos.com,
      Authorization Callback Domain `proairetos.com`), then in Cloudflare > the proairetos Worker > Settings > Variables and
      Secrets add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` (both as Secrets). A new Strava app connects only its owner
      until Strava approves more athletes (request it in the same settings page when others use it).
- [ ] Migration `20261023000000_passkey_first.sql`: new accounts can set up with a passkey and no passphrase.
- [ ] Migration `20261018000000_shared_lists.sql`: Soma's shared grocery list, Ergon's household, Phyton's shared plants.
- [ ] Migration `20261019000000_sign_in_handoff.sql` and the `sign-in-handoff` function: "Sign in other apps".
- [ ] Migration `20261020000000_passkeys.sql` and the `passkey-sign-in` function (one file, named exactly that, Verify JWT off): passkeys
      (steps in `docs/SERVER_SETUP.md`).
- [ ] Redeploy `send-reminders` once more: pushes now go at high urgency, so Android's battery saving and an iPhone in
  Low Power Mode no longer hold reminders back.
- [ ] Redeploy `send-reminders` again: its reply now lists any push a phone's service refused, and why (`refused` in `net._http_response`).
- [ ] Redeploy `send-reminders` (it now also sends a Declarative Web Push for iPhones). Optional secret `SITE_URL` if
      the site is ever not https://proairetos.com.
- [ ] Your own storage, reusing Noesis's registrations: migration `20261021000000_storage_links.sql`; add
      `https://proairetos.com/storage-connected/` as a redirect address in Noesis's Google client, Dropbox app and
      Microsoft registration (Single-page application); add `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET`
      to the proairetos Worker as secrets (steps in `docs/SERVER_SETUP.md`, "Your own storage").
- [ ] Calendar subscription: its migration and the `calendar-feed` function (download a file already works without them).
- [ ] (Optional) Stays with prices in Poreia: an account at liteapi.travel (free to search; it earns on bookings), then the
  Cloudflare Worker secret `LITEAPI_KEY` (sandbox key first to try it, live key after; steps in `docs/SERVER_SETUP.md`, "Poreia's live searches"). Without it Poreia links to Booking.com,
  Airbnb and the rest.
- [ ] (Optional) Flights with prices in Poreia: an account at duffel.com (searches are free up to a search-to-booking ratio),
  then the Worker secret `DUFFEL_KEY` (test key shows sample airlines; live needs Duffel's checks). Without it Poreia links to
  Google Flights, Kayak and the rest.
- [ ] (Optional) Events in Poreia: a free key from developer.ticketmaster.com (Discovery API), added as the Cloudflare Worker
  secret `TICKETMASTER_KEY`. Without it Poreia links to Ticketmaster and SeatGeek searches instead of listing events.
- [ ] Phyton photo identification: a free key from my.plantnet.org, added as the Cloudflare Worker secret `PLANTNET_KEY`
      (steps in `docs/SERVER_SETUP.md`). Free plan: 500 a day, non-commercial.

- [x] The waitlist on the front page: run `20261026000000_waitlist.sql` (uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`,
      already set for Capture from anywhere). Until then the form shows "That didn't go through". Read the list in the
      SQL editor: `select email, apps, source, created_at from public.waitlist order by created_at;` To take someone
      off: `delete from public.waitlist where email = '…';`
- [x] Newsletter consent on the waitlist: run `20261101000000_waitlist_letters.sql` after the waitlist migration. Until
      then the form still works and the box is simply not kept. Who said yes: `select email, letters_at from
      public.waitlist where letters order by letters_at;`
- [ ] First-week emails: run `20261102000000_first_week_emails.sql`, verify proairetos.com in Resend, add secrets
      `RESEND_API_KEY` and `EMAIL_SIGNING_SECRET` (steps in SERVER_SETUP.md "First-week emails").
- [ ] The Store's subscriptions (Core $9.99/month, Soma and Phyton $3.99/month each, bundle $6.99/month, cloud
      $2.99/month; Proairetos free): run `20261025000000_purchases.sql`, `20261029000000_beta_access.sql` and
      `20261030000000_recurring_purchases.sql`, set up Stripe
      (secret key, a webhook to `https://proairetos.com/api/store/webhook`), and add the Worker secrets
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Steps in SERVER_SETUP.md, "The Store".
      Try it first with Stripe's test keys and card 4242 4242 4242 4242.
- [ ] Beta access: run `20261029000000_beta_access.sql`, then manage seven-day app access from Settings as the owner
      account (`boleydavid7@gmail.com`). Beta does not include Proairetos cloud.
- [ ] Household (Settings > The app > Household): run `20261018000000_shared_lists.sql` if not yet, then
      `20261031000000_household_invites.sql` (invites by email). Check with a second account: make a household, switch on
      Chores, invite the other account's email; it must have signed in and opened its data on this version once. The
      invite shows on its Today card and bell; Join, then tick a chore on each phone and see it on the other.
- [ ] Before selling Phyton: Pl@ntNet's free plan is non-commercial; move to its paid plan.
- [ ] Search: add proairetos.com and noesis.proairetos.com to Google Search Console (https://search.google.com/search-console)
      and Bing Webmaster Tools (https://www.bing.com/webmasters, which can import from Google), verify each (a DNS TXT
      record in Cloudflare is easiest), then submit `https://proairetos.com/sitemap.xml` and
      `https://noesis.proairetos.com/sitemap.xml`.

- [ ] Poreia's forwarding address: run migration `20261027000000_trip_inbox.sql`, turn on Email Routing for
      proairetos.com with the catch-all sent to the proairetos Worker (SERVER_SETUP.md "Poreia's forwarding address"),
      then forward one real confirmation and check it lands on its trip.

## On a real phone

- [ ] Poreia reminders: add a timed booking an hour or two ahead (Lead "30 minutes"), close Poreia, and check the notice
  arrives as Poreia with its icon; tapping it should open that booking.
- [ ] Poreia offline: on a trip's Overview tap Keep for offline, turn on airplane mode, reopen Poreia and check the map,
  Around and the guide still show.
- [ ] Poreia together: share a trip from one phone (signed in), open the invite on another phone (signed in to another
  account), join, add a spend on each and check both see both within half a minute.
- [ ] Poreia bringing bookings in: on Android share a confirmation email or PDF to Poreia; on iPhone choose a PDF or a
  screenshot with "A file or screenshot" on a new booking.
- [ ] Poreia Days: pull an untimed plan by its grip (left edge) to a new place; check it doesn't also start the row's
  swipe-to-delete.

- [ ] Reminders arrive with the apps closed, and a tap opens the right app. Quickest check: Settings > Notifications >
  "Send one through the server", then close the app; it comes within about a minute (after redeploying
  `send-reminders`). If it does not, the reply in `net._http_response` says why.
- [ ] New icons: an app already on the iPhone Home Screen keeps its old icon until it is removed and added again
  (back up first if that app is signed out; signed-in apps sync back). Android picks them up by itself over a few days.
- [ ] Your own storage: connect one, check every app follows (another device, an iPhone Home Screen app), then move
      back, once on your own account (tested so far with a stand-in folder, not the real providers).
- [ ] Backups in your own storage: with your account syncing through Drive, Dropbox or OneDrive, open any app the
      next day and check a `backup-<date>.sealed` file appears in the Proairetos folder; then on an iPhone, Settings >
      Back up and restore > Restore should list that day and open it.
- [ ] Swipe gestures: edge swipe back, pulling a row to mark it.
- [ ] Moving between apps on the phone (Safari 18.2+): the bars should hold still while the old app eases back and the new one settles in; pages inside an app come in from the side you went.
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
- [ ] Shared list: Settings > Shared list, make it, send the invite to your partner's phone, join there, and add and tick from both (it uses the same server tables as Soma's shared groceries).
- [ ] Therapeia: add a medicine for a child (For someone else), and check its dose notice says whose it is.

- [ ] Design round (Oct 16), on your iPhone with the apps installed. Tell me anything that feels off:
  - Open a few apps' More pages: margins line up with Proairetos, "Reminders" sits above its card.
  - Tap a row into its page (Soma More > Your year, an Ergon chore): the row should grow into the page title, not
    jump. Safari 18+ only; older iPhones just slide.
  - Move between tabs: the new tab lights at once, the old one fades a moment later.
  - Small text: Praxis's and Theoria's bottom bars, Hydros's Flow chart, the month calendar in Days ahead.
  - Each app's home picture: one light, upper right, no clouds.
  - Anything that scrolls sideways, overlaps, or is hard to tap.
  - The top bar: app name left; search, Settings and Proairetos (or Apps) right, gone from the bottom bar; scroll a long page and the bar turns to glass.
  - From the Home Screen app, swipe from the left edge slowly, let go early (springs back), then all the way.
  - Pull a sheet down slowly and let go (springs back), then flick it (closes).

## Phone apps (iOS and Android), when you are ready
- [ ] On a Mac: `npx cap add ios`, then `npm run cap:sync` with `VITE_API_BASE=https://proairetos.com`, open in Xcode, run on your iPhone.
- [ ] Android Studio: `npx cap add android`, add `SCHEDULE_EXACT_ALARM` to `AndroidManifest.xml`, run on a phone.
- [ ] In the app: allow notifications, set a to-do 2 minutes ahead, close the app, and check the reminder arrives and opens it.
- [ ] Apple Developer ($99/yr) and Play Console ($25) accounts; your Apple Team ID (needed for sign-in links into the app).

## To look over

- [ ] Phyton's pet toxicity list (`src/phyton/core/species.ts`): spot-check a few against the ASPCA list
      (aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants).

## Later, by choice

- [ ] Store stage 2: payment and server checks of added apps (all free for now).
- [ ] Phone apps (on hold): native projects, native reminders, widgets (`docs/NATIVE.md`).

## Search engines (owner)

- [ ] Google Search Console: add the domain `proairetos.com` (Domain property), verify with the DNS TXT record in
      Cloudflare (DNS > Add record > TXT), then Sitemaps > submit `https://proairetos.com/sitemap.xml`.
- [ ] Bing Webmaster Tools: sign in and choose "Import from Google Search Console" (brings the site and sitemap over).
- [ ] After a week: Search Console > Pages, check `/welcome/` and the app pages are indexed.
