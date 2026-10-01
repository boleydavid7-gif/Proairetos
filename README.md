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

Everything is stored on the device in IndexedDB. If a browser blocks
storage, the app keeps data in memory for that visit and says so.

Optional sync is end-to-end encrypted: records are sealed on the device
(AES-GCM) with a key the server never sees, and stored in Supabase behind
row-level security. Reminders send only times to the server. See
[docs/SERVER_SETUP.md](docs/SERVER_SETUP.md) to turn it on; without the
`VITE_SUPABASE_*` settings the app runs fully offline.

`supabase/` holds the database migration and the reminder function.
