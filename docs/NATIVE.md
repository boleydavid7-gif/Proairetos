# Proairetos as a phone app (App Store and Play Store)

The web app can be wrapped with Capacitor so it installs from the stores. What is set up in this
repository: `capacitor.config.json`, the Capacitor packages, the `cap:*` scripts, and `VITE_API_BASE`, which
points the calendar and recipe imports at the live site (the Worker allows the app's origin).

What is not done, and needs your accounts and computers:

## What you need
- **Apple:** a Mac with Xcode, and an Apple Developer account (about $99 a year) for TestFlight and the
  App Store.
- **Google:** Android Studio (any computer), and a Play Console account ($25 once).
- Icons and splash images (1024 px square icon; a 2732 px splash). `npx @capacitor/assets generate`
  makes every size from them.

## Steps
1. `npm install`
2. `npx cap add ios` and `npx cap add android` (once; makes the `ios/` and `android/` folders, which are not
   kept in git).
3. `npm run cap:sync` (builds the app for the phone with the live address and copies it in).
4. `npm run cap:ios` opens Xcode; `npm run cap:android` opens Android Studio. Run on a device, then
   archive and upload.
5. After each change to the web app, `npm run cap:sync` again.

## Known gaps before a store release
- **Reminders when the app is closed.** Web push does not work inside the phone app's web view. Notifications
  there need `@capacitor/local-notifications` (and, for the server's reminders, Apple and Firebase push),
  wired to the same lists the web app builds (`app/notify/`). Not done.
- **Sign-in link.** The email link opens the website, not the app. Add universal links (iOS) and app links
  (Android) for `proairetos.com`, or keep signing in by pasting the link, which works inside the app.
- **Widgets** (home and lock screen) are native code (WidgetKit on iPhone, Glance on Android) and are not
  built.
- **Store review.** Apple expects more than a website in a frame; the lock, offline use and files help. Plan
  for a round or two of review feedback.
- Keep `public/_headers`' security headers and the service worker as they are; the web build is unchanged.
