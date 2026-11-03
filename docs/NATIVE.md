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
   kept in git). Capacitor 8 uses Swift Package Manager for a new iOS project.
3. `npm run cap:sync` (builds the native profile with the live address and copies it in).
4. `npm run cap:ios` opens Xcode; `npm run cap:android` opens Android Studio. Run on a device, then
   archive and upload.
5. After each change to the web app, `npm run cap:sync` again. The local Askesis plugin is installed by `npm install` and discovered automatically by Capacitor; do not copy plugin source into the generated platform folders.

## What is ready for the phone apps (the website is unchanged by all of it)
- **One app holds the family.** The native profile uses `dist-native/`, so every app's page (`/askesis/`, `/soma/`, …)
  opens inside the one store app, with one storage: no separate sign-in per app.
- **Smaller native package.** The web build keeps its local sound and OCR payloads. The native build points those
  optional files at `https://proairetos.com`, removes them from `dist-native/`, and caches each file on the phone after
  first use. The current native build is about 17 MB instead of the full 69 MB web deployment.
- **Server helpers.** Every `/api/…` call goes through `apiUrl` (`app/apiBase.ts`), so with `VITE_API_BASE` set the
  app reaches the live site. The Worker answers the app's own origins (`capacitor://localhost`, `https://localhost`)
  on every `/api` route, as if from the site; other websites stay kept out (`worker/index.ts`, test
  `src/tests/worker/nativeOrigins.test.ts`).
- **Reminders on the phone.** Inside the app (`app/native/platform.ts` `isNativeApp`), `app/notify/notifications.ts`
  hands the same notices it works out for the web to the phone's own notifications (`app/native/localReminders.ts`,
  `@capacitor/local-notifications`, loaded only in the app): the soonest 60 (iPhone keeps at most 64), set again on
  every opening and change, worded as on the web, and a tap opens the notice's page (`core/notify/place.ts`, the same
  rules as `sw.js`). They arrive with the app closed, without the server. Android also needs the exact-alarm
  permission line in `AndroidManifest.xml` (`SCHEDULE_EXACT_ALARM`), added after `npx cap add android`.

## Askesis native plugin package (Phase 7A)

The native bridge source is version-controlled at `packages/capacitor-askesis-bridge/`. The package is a local file dependency in the root `package.json`, so a clean `npm ci` installs it without a registry publish.

- iOS source: `ios/Sources/AskesisBridgePlugin/AskesisBridgePlugin.swift`, included by `Package.swift` as a Swift Package Manager plugin for Capacitor 8.
- Android source: `android/src/main/java/com/proairetos/askesisbridge/AskesisBridgePlugin.java`, included by its Gradle library module.
- Plugin metadata: the package's `capacitor` field points Capacitor to the iOS and Android source directories.
- JavaScript registration: `src/askesis/app/capabilities.ts` registers the matching plugin name, `AskesisBridge`.

Both native implementations currently return protocol v1 and the correct platform, with every optional capability set to `false`. This is intentional: it proves the installed plugin can handshake without advertising health access, background tracking, haptics, lock-screen controls or watch sync before those features exist.

To rebuild the local native projects from source, run `npm ci`, create the platforms once if needed, then run `npm run cap:sync`. Capacitor discovers and links the local plugin during sync. The generated `ios/` and `android/` app folders remain ignored by Git; only the reusable plugin package is committed.

## Optional Askesis phone bridge

Askesis remains a web-first app. The browser provider is always available; the phone bridge adds capabilities only when the installed Capacitor app actually implements them. A missing or incompatible bridge must never prevent Askesis from opening or logging workouts.

The first capability-discovery slice is in:

- `src/askesis/app/capabilities.ts`: always resolves web capabilities first; imports `@capacitor/core` only when `isNativeApp()` is true; discovers the optional `AskesisBridge` plugin and validates its protocol.
- `src/askesis/screens/DevicePage.tsx`: shows which browser features work and which optional phone features the bridge advertises.
- `src/tests/askesis/capabilities.test.ts`: verifies web fallback, explicit native capability flags, and protocol/platform mismatch handling.

### Bridge handshake, protocol v1

The iOS and Android Capacitor projects are generated locally (the `ios/` and `android/` folders are not kept in git). Each native project may register a Capacitor plugin named `AskesisBridge` with this method:

```ts
type AskesisBridgeHandshake = {
  protocolVersion: 1;
  platform: 'ios' | 'android';
  capabilities: {
    healthWorkouts?: boolean;
    heartRate?: boolean;
    backgroundGps?: boolean;
    haptics?: boolean;
    lockScreenControls?: boolean;
    watchSync?: boolean;
  };
};

interface AskesisBridgePlugin {
  getCapabilities(): Promise<AskesisBridgeHandshake>;
}
```

Only an explicit `true` is treated as supported. The protocol version and platform must match. Missing plugins, rejected calls, and incompatible versions fall back to the web provider.

A capability flag means the bridge can provide that feature; it does **not** mean the user has granted permission or that Askesis is already reading health data. Health permission and workout-reading methods are deliberately not part of this discovery-only slice. They must be added later as explicit user actions, with a review step before imported workouts are saved.

### Web fallback (always available)

- Browser foreground GPS when `navigator.geolocation` exists; the current guide keeps the screen awake because browser location can stop when the screen locks.
- Manual heart-rate entry.
- GPX/TCX watch-file import.
- Guided sessions, timers, spoken cues and bells.

The bridge can later add HealthKit on iOS, Health Connect on Android, background GPS, native haptics, lock-screen controls and watch sync. None of those are prerequisites for the web app, and no health permission is requested merely by opening Device integrations.

## Known gaps before a store release
- **Reminders past the next 60.** The phone keeps the soonest 60; they are set again whenever the app opens or
  something changes. Someone who does not open the app for weeks gets the first 60. Server push to the phone (Apple
  and Firebase, through `send-reminders`) would cover that; not done.
- **Sign-in link.** The email link opens the website, not the app. Add universal links (iOS) and app links
  (Android) for `proairetos.com`, or keep signing in by pasting the link, which works inside the app.
- **Widgets** (home and lock screen) are native code (WidgetKit on iPhone, Glance on Android) and are not
  built.
- **Store review.** Apple expects more than a website in a frame; the lock, offline use and files help. Plan
  for a round or two of review feedback.
- **Native OCR.** The native profile uses `capacitor-vision`: Apple Vision on iOS and ML Kit on Android. The image
  is passed to the native plugin in memory and is not uploaded or written to the app cache. Use the iOS deployment
  target required by the Capacitor 8 project generated by Xcode.
- Keep `public/_headers`' security headers and the service worker as they are; the web build is unchanged.
