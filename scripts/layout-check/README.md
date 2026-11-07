# Layout check

Measures, in every app and in dark and light: the dock's line centered over the current icon, top-bar icons
centered in their buttons and at least 44 px to tap, and the undo bar clear of the dock. Nothing here is judged by
eye; each is a number with a tolerance of 1.5 px.

```
npm run build && npx vite preview --port 4173 &
CHROMIUM=/opt/pw-browsers/chromium node scripts/layout-check/check.mjs
```

It exits with 1 and a list when something has drifted.
