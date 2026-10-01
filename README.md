# Proairetos

A personal operating system for intentional living. See
[docs/PRODUCT_ARCHITECTURE.md](docs/PRODUCT_ARCHITECTURE.md) for the product rules.

## Develop

```
npm install
npm run dev        # local server
npm test           # unit tests, including the language guard
npm run typecheck
npm run build      # typecheck + production build into dist/
```

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Node.js 20 or newer

`public/_headers` keeps the service worker and app shell uncached so new
versions reach people promptly.

## Data

Everything is stored on the device in IndexedDB. Nothing leaves the
browser yet. If a browser blocks storage, the app keeps data in memory for
that visit and says so.
