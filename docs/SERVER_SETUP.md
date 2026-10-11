# Setting up sync and reminders

Proairetos works fully without a server. These steps add encrypted sync
across devices and private reminders. Allow about 30 minutes. Everything
here fits Supabase's free tier.

You will end up with three public values for Cloudflare and a few secrets
that stay in Supabase. Never put the Supabase **service role** key or the
VAPID **private** key in Cloudflare or in this repository.

---

## 1. Create the Supabase project

1. Sign up at https://supabase.com and choose **New project**.
2. Pick a region close to you. Save the database password somewhere safe
   (you will rarely need it).
3. Wait for the project to finish starting.

## 2. Create the tables

1. Open **SQL Editor** and choose **New query**.
2. Paste the whole contents of
   `supabase/migrations/20261001000000_proairetos_sync.sql` and choose **Run**.
3. It is safe to run again if anything was interrupted.
4. Do the same with `supabase/migrations/20261002000000_calendar_feed.sql`
   (only needed for the calendar subscription link, but harmless otherwise).
5. And with `supabase/migrations/20261003000000_askesis_sync.sql`, so Askesis
   (the training app) can sync its workouts and plan with the same account.
   Until it runs, Askesis keeps them on the phone and Proairetos syncs as usual.
6. And with `supabase/migrations/20261010000000_soma_sync.sql`, so SOMA
   (recipes) syncs its recipes and grocery list too. Until it runs, SOMA keeps
   them on the phone.

This creates four tables, each locked so a person can only ever reach their
own rows:

| Table | Holds | Readable by the server? |
| --- | --- | --- |
| `records` | Your data, sealed on your device | No: encrypted |
| `user_keys` | Your data key, locked by your passphrase and by your recovery key | No: encrypted |
| `push_subscriptions` | Where to deliver notifications to your devices | Yes (an address, no content) |
| `reminders` | When to remind you, as times and hashed ids | Times only |
| `calendar_feeds` | Only if you turn on the calendar link: the calendar file you chose to publish | Yes, by your choice |

## 3. Sign-in emails

1. **Authentication → Sign In / Providers → Email**: make sure Email is
   enabled.
2. **Authentication → URL Configuration**: set **Site URL** to
   `https://proairetos.com`. Under **Redirect URLs**, add
   `https://proairetos.com/**` (and `https://www.proairetos.com/**` if you
   use www).

That is all that is required. Supabase's standard email contains a sign-in
**link**, and the app accepts it two ways:

- **Paste it** (works everywhere, including the iPhone Home Screen app):
  long-press the link in the email, choose **Copy**, and paste it into the
  "Code or link from the email" box. Do not open the link first; a link
  works once.
- **Open it** in the same browser you use the app in (a computer, or
  Android): you are signed in directly.

**Optional: a 6-digit code instead.** On the free plan the email templates
are locked (greyed out) while Supabase's built-in sender is used. To unlock
them, add your own sender under **Authentication → Emails → SMTP Settings**
(for example a Gmail app password, or a provider such as Resend). Then edit
both the **Magic Link** and **Confirm signup** templates to include the code:

```html
<h2>Your Proairetos code</h2>
<p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
<p>If you did not ask for it, you can ignore this email.</p>
```

Your own sender also lifts Supabase's limit of a few emails per hour, which
matters if other people will use the app.

## 4. Copy the public settings

- **Project URL** (becomes `VITE_SUPABASE_URL`): the **Connect** button on
  the project's home page shows it; so does **Project Settings → Data API**.
  It is always `https://YOUR_PROJECT_REF.supabase.co`, where the ref is the
  last part of the dashboard address (`supabase.com/dashboard/project/REF`).
- **Key** (becomes `VITE_SUPABASE_ANON_KEY`): **Project Settings → API Keys**,
  the **Publishable** key (`sb_publishable_…`); or under **Legacy API keys**,
  the **anon public** key (`eyJ…`). Never the secret or service_role key.

The anon key is designed to be public; the table locks from step 2 are what
protect your data.

## 5. Create reminder keys (VAPID)

On any computer with Node.js:

```
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**.

- The public key becomes `VITE_VAPID_PUBLIC_KEY` (Cloudflare).
- The private key is a secret for Supabase only (step 7).

## 6. Add the settings to Cloudflare

Proairetos is deployed as a Cloudflare **Worker** connected to GitHub. The
three values are needed when the app is **built**, so they go in the build
settings, not the runtime ones.

1. Cloudflare dashboard → **Workers & Pages** → **proairetos** →
   **Settings** → **Build**.
2. Check the build configuration:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/` (leave empty if it shows a blank field)
3. Under **Build → Variables and secrets** (sometimes labelled **Build
   variables**), add:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project URL from step 4 |
   | `VITE_SUPABASE_ANON_KEY` | Publishable or anon key from step 4 |
   | `VITE_VAPID_PUBLIC_KEY` | Public key from step 5 |

   Do not add them under the Worker's runtime **Variables and Secrets**;
   the app reads them only while being built.
4. Start a new build: **Deployments → View build history → Retry build**,
   or push any commit to `main`.

These values are baked into the app, so rebuild after changing them.

At this point **sync works**. Reminders need two more steps.

## 7. Deploy the reminder function

**Without a computer (Supabase dashboard):** **Edge Functions → Secrets**,
add the four secrets below. Then **Edge Functions → Deploy a new function →
Via editor**, name it `send-reminders`, paste the contents of
`supabase/functions/send-reminders/index.ts`, deploy, and in the function's
**Details** turn **Enforce JWT verification** off. Repeat for
`delete-account` (leave JWT verification on) and, if you want the calendar
link, `calendar-feed` (JWT verification off).

**With a computer:** install the Supabase CLI (https://supabase.com/docs/guides/cli), then from
this repository:

```
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set \
  VAPID_PUBLIC_KEY="public key from step 5" \
  VAPID_PRIVATE_KEY="private key from step 5" \
  VAPID_SUBJECT="mailto:you@example.com" \
  CRON_SECRET="a long random string you make up"
supabase functions deploy send-reminders --no-verify-jwt
```

So people can delete their account and server data themselves (Settings →
Account and sync), deploy:

```
supabase functions deploy delete-account
```

Leave JWT verification on for this one: only a signed-in person can call
it, and only for their own account.

For the calendar subscription link, also deploy:

```
supabase functions deploy calendar-feed --no-verify-jwt
```

Here `--no-verify-jwt` is needed because calendar apps cannot sign in; the
function serves a feed only to a link holding its long random token.

`YOUR_PROJECT_REF` is the part before `.supabase.co` in your Project URL.
`--no-verify-jwt` is correct here: the function instead checks
`CRON_SECRET`, so only your scheduled job can run it.

## 8. Run it every minute

1. **Database → Extensions**: enable `pg_cron` and `pg_net`.
2. **SQL Editor**, new query, with your values filled in:

   ```sql
   select cron.schedule(
     'proairetos-reminders',
     '* * * * *',
     $$
     select net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', 'THE SAME CRON_SECRET AS STEP 7'
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```

To stop it later: `select cron.unschedule('proairetos-reminders');`

## 9. Try it

1. Open the app, tap the gear (top right), then **Account and sync**.
2. Enter your email, then paste the link (or code) from the email.
3. Choose a passphrase. **Write down the recovery key it shows.** It is the
   only way back in if you forget the passphrase. Nobody, including
   Supabase, can recover it for you.
4. On a second device, sign in with the same email and enter the passphrase.
5. Calendar link (optional): **Settings → Calendar subscription → Create
   link**, then use the Apple, Google, or Outlook button it shows.
6. Notifications on **iPhone**: open the site in Safari, **Share → Add to
   Home Screen**, open Proairetos from the Home Screen (iOS 16.4 or newer).
   Then **Settings → Notifications → Allow notifications**, and switch on
   **Also when the app is closed**. On **Android**, do the same in Settings
   directly.

---

## What the server can and cannot see

- **Cannot see:** anything you write: items, notes, reflections, decisions,
  values, schedules. These are encrypted on your device with a key the
  server never has.
- **Can see:** your email address; how many records you have, their rough
  sizes, which kind each is (for example "reflections"), and when they
  changed; the times reminders are due; and the push address of each device
  with reminders on.
- Notifications are written on your phone when the (empty) push arrives,
  from what is on the device; the server never sees the words. Settings →
  Notifications → On the lock screen can hide the details there too.
- **Calendar link, only if you turn it on:** the calendar file you chose to
  publish is readable by the server and by anyone with the link. By default
  it holds only the times of your commitments, titled "Busy". Turning it off deletes it.

## Good to know

- **The phone stays the main copy.** The app works offline; sync catches up
  when you are back online. If the same thing was changed on two devices
  between syncs, the device that syncs later keeps its version.
- **Free projects pause** after about a week with no activity. Your phone
  keeps working; sync resumes once you restore the project from the
  Supabase dashboard.
- **Signing out** keeps your data on the device and in your encrypted
  account; it only stops syncing.
- **Delete everything** in Settings signs the device out first, so it clears
  only that device.
- Keep using **Back up** now and then. It is independent of the server.

## Settings and files sync (migration 20261016000000)

Run `supabase/migrations/20261016000000_preferences_files_sync.sql`. It lets settings and photo/file details sync, and creates the private `proairetos-files` bucket (12 MB limit; files arrive already encrypted). Redeploy `delete-account` so it also clears a person's files: `supabase functions deploy delete-account`. Until the migration runs, these are held on the device and everything else syncs as before.

## Reminders from every app (migration 20261017000000)

So reminders from HYDROS (water), Oikonomia (bills), Askesis (run days), Praxis (the end of a study block),
Diaita (wind down, nap), Philia (birthdays, keeping in touch) and Ergon (chores)
arrive with their own words on a phone where Proairetos is the app that receives pushes:

1. In the SQL editor, run `supabase/migrations/20261017000000_reminder_sources.sql`. It gives each app its own
   reminder rows (so one app never removes another's) and a column for the words, sealed on the phone with your
   account key. The server passes them along and cannot read them.
2. Redeploy the reminder function with the new code: **Edge Functions → send-reminders → Code**, paste
   `supabase/functions/send-reminders/index.ts`, and deploy (or `supabase functions deploy send-reminders --no-verify-jwt`).
   The cron job and keys stay as they are.
3. Open each app you use once while signed in (Proairetos, HYDROS, Oikonomia, Askesis, Praxis, Diaita, Philia, Ergon), so each sends its
   times. Keep reminders turned on in Proairetos; the other apps add theirs to it.

Run step 1 before step 2. Until both are done, Proairetos's own reminders keep working exactly as now.

## Shared lists and households (migration 20261018000000)

Run `supabase/migrations/20261018000000_shared_lists.sql`. It makes SOMA's shared grocery list and Ergon's
shared household work: every line or chore is sealed on the phone with that list's own key, which travels only
in the invite link, so the server stores them without being able to read them. Both people need to be signed in
(any account; no passphrase needed for a shared list). Nothing else changes.

All three migrations above are safe to run again; running them in date order on a server that already has some
of them does no harm.

## Sign in with Google or Apple (optional)

The email code keeps working either way. Your passphrase still unlocks your data after any sign-in: Google
or Apple only proves who you are; they never see what you write.

**First, in Supabase:** Authentication → URL Configuration → Redirect URLs → add `https://proairetos.com/**`.

**Google** (free):
1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, then **APIs & Services →
   OAuth consent screen** (External; app name Proairetos; your email). Publish it.
2. **Credentials → Create credentials → OAuth client ID → Web application.** Under *Authorized redirect URIs*
   add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. Copy the Client ID and Client secret into Supabase: **Authentication → Sign In / Providers → Google**, turn it on, save.

**Apple** (needs the Apple Developer Program):
1. In Certificates, Identifiers & Profiles, make an **App ID** with *Sign in with Apple*, then a **Services ID**
   (for example `com.proairetos.web`) with *Sign in with Apple* configured: domain `YOUR_PROJECT_REF.supabase.co`,
   return URL `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
2. Make a **Key** with *Sign in with Apple*, download the `.p8` file.
3. In Supabase, **Authentication → Sign In / Providers → Apple**: Services ID as the client ID, and the secret
   made from the key (Supabase's Apple page has a generator; the secret lasts six months, so renew it).

**Then show the buttons:** in Cloudflare (Workers → proairetos → Settings → Variables and secrets, *build*
variables), add `VITE_SIGN_IN_WITH` with `google`, `apple` or `google,apple`, and deploy again. The buttons
appear in Proairetos's account page and in every app's account card.

On an iPhone Home Screen app, try it once: if the sign-in finishes in Safari instead of the app, use the email
code there; it signs in the same account.

## Shared grocery lists (migration 20261018000000)

Run `supabase/migrations/20261018000000_shared_lists.sql` in the SQL editor. It adds shared lists for SOMA:
a list's lines are sealed on the phone with the list's own key, which travels only inside the invite link
(after the `#`, which is never sent to a server), so the server stores lines it cannot read. Only people who
joined with the link can see or change a list, and anyone can leave. Nothing else needs deploying. Until it
runs, SOMA's Shared view says the server is not set up yet.
