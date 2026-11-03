# Askesis native bridge

This is a local Capacitor 8 plugin package. It is installed from the Proairetos repository as a file dependency and is discovered by `npx cap sync`.

The plugin name is `AskesisBridge`, matching the JavaScript registration in `src/askesis/app/capabilities.ts`.

## Current contract

`getCapabilities()` returns protocol version 1, the native platform, and explicit booleans for:

- `healthWorkouts`
- `heartRate`
- `backgroundGps`
- `haptics`
- `lockScreenControls`
- `watchSync`

All capabilities intentionally return `false` in this foundation phase. A bridge handshake confirms that the plugin is installed and compatible; it does not imply health permission or data access.

## Platform source

- iOS: `ios/Sources/AskesisBridgePlugin/AskesisBridgePlugin.swift`, packaged as a Swift Package for Capacitor 8.
- Android: `android/src/main/java/com/proairetos/askesisbridge/AskesisBridgePlugin.java`.

Do not edit the generated `ios/` or `android/` app folders. Change this package, then run `npm install` and `npm run cap:sync`.
