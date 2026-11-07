# Visual smoke coverage

Start the production preview server, then run `npm run smoke:visual`.

The runner visits every family app in phone dark, phone light, and desktop dark modes. It writes screenshots to `/tmp/proairetos-visual` by default and fails when an app reports a page error, creates horizontal overflow, mounts more than one root, has an unnamed visible control, cannot render its visible title frame, or displays a broken or undersized local image. It also compares title placement and those layout invariants with the checked-in `baseline.json`.

Set `VISUAL_BASE_URL` to point at another preview server, `VISUAL_OUT` to choose the screenshot directory, `VISUAL_BASELINE` to use another baseline, or `PLAYWRIGHT_MODULE` when Playwright is installed somewhere other than the managed Codex environment. Set `VISUAL_BASELINE_UPDATE=1` when an intentional layout change should become the new baseline.
