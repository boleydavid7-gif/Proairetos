# Visual smoke coverage

Start the production preview server, then run `npm run smoke:visual`.

The runner visits every family app in phone dark, phone light, and desktop dark modes. It writes screenshots to `/tmp/proairetos-visual` by default and fails when an app reports a page error, creates horizontal overflow, mounts more than one root, or cannot render its visible title frame.

Set `VISUAL_BASE_URL` to point at another preview server, `VISUAL_OUT` to choose the screenshot directory, or `PLAYWRIGHT_MODULE` when Playwright is installed somewhere other than the managed Codex environment.
