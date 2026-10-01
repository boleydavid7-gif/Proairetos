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

This creates four tables, each locked so a person can only ever reach their
own rows:

| Table | Holds | Readable by the server? |
| --- | --- | --- |
| `records` | Your data, sealed on your device | No: encrypted |
| `user_keys` | Your data key, locked by your passphrase and by your recovery key | No: encrypted |
| `push_subscriptions` | Where to deliver notifications to your devices | Yes (an address, no content) |
| `reminders` | When to remind you, as times and hashed ids | Times only |

## 3. Turn on sign-in by emailed code

Proairetos signs in with a 6-digit code instead of a link, because on iPhone
a link opens Safari, which does not share storage with the app on your Home
Screen.

1. **Authentication → Sign In / Providers → Email**: make sure Email is
   enabled.
2. **Authentication → Emails → Templates → Magic Link**: replace the body
   with something that includes the code, for example:

   ```html
   <h2>Your Proairetos code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>If you did not ask for it, you can ignore this email.</p>
   ```

3. **Authentication → URL Configuration**: set **Site URL** to your
   Cloudflare address (for example `https://proairetos.pages.dev`).
4. Supabase's built-in email is limited to a few messages per hour. That is
   fine for one person. If others will use the app, add your own email
   provider under **Authentication → Emails → SMTP Settings**.

## 4. Copy the public settings

**Project Settings → API**:

- **Project URL**: this becomes `VITE_SUPABASE_URL`
- **anon public** key: this becomes `VITE_SUPABASE_ANON_KEY`

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

Cloudflare dashboard → **Workers & Pages** → your Proairetos project →
**Settings → Variables and Secrets** (or **Environment variables**). Add to
both **Production** and **Preview**:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL from step 4 |
| `VITE_SUPABASE_ANON_KEY` | anon public key from step 4 |
| `VITE_VAPID_PUBLIC_KEY` | Public key from step 5 |

Then redeploy (**Deployments → Retry deployment**, or push any commit).
These values are built into the app, so a redeploy is needed after changing
them.

At this point **sync works**. Reminders need two more steps.

## 7. Deploy the reminder function

Install the Supabase CLI (https://supabase.com/docs/guides/cli), then from
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

1. Open the app, then **Compass → Settings and your data → Account and sync**.
2. Enter your email, then the code from the email.
3. Choose a passphrase. **Write down the recovery key it shows.** It is the
   only way back in if you forget the passphrase. Nobody, including
   Supabase, can recover it for you.
4. On a second device, sign in with the same email and enter the passphrase.
5. For reminders on **iPhone**: open the site in Safari, **Share → Add to
   Home Screen**, open Proairetos from the Home Screen, then turn on
   reminders in Settings (iOS 16.4 or newer). On **Android**, turn them on
   in Settings directly.

---

## What the server can and cannot see

- **Cannot see:** anything you write: items, notes, reflections, decisions,
  values, schedules. These are encrypted on your device with a key the
  server never has.
- **Can see:** your email address; how many records you have, their rough
  sizes, which kind each is (for example "reflections"), and when they
  changed; the times reminders are due; and the push address of each device
  with reminders on.
- Notifications say only "Something you chose is ready". The details are
  in the app.

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
