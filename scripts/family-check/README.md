# Family check

Two browser checks against a built site (`npm run build`, then `npx vite preview --port 4173`).
They need Playwright (`npx playwright` or a global install; set `CHROMIUM` to a browser path if needed).

- `alone.mjs`: each of the twelve add-on apps with only Proairetos beside it. Walks every tab and reports
  page errors and any mention of an app that is not added. Every list should be empty.
- `together.mjs`: everything added, one browser profile (as on a computer), Monday 10:00 during a work block.
  Each app adds something through its own screens; the check looks for it where it should show
  (Proairetos Today, Days ahead, Reflect, search, notices, Oikonomia's Spent), then live updates between
  open apps, removing an app, and appearance. Prints PASS or FAIL per line.
