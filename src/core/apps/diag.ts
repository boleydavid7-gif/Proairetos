import { APPS } from './manifest';

/*
 * The storage diagnostic's pages (temporary; see docs/IPHONE_STORAGE_DIAGNOSTIC.md). One small page per app, served
 * under /lab/diag/<app>/ so no app's own worker or cache ever sees it. Names and icons come from the manifest.
 * `npm run apps:build` writes them; a test keeps them current. Remove with `public/lab/diag` and this file.
 */
export const DIAG_APPS = ['hydros', 'soma', 'melete'] as const;

const found = (id: string) => {
  const app = APPS.find((each) => each.id === id);
  if (!app) throw new Error(`the diagnostic names ${id}, which is not in the manifest`);
  return app;
};

export function diagFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const id of DIAG_APPS) {
    const app = found(id);
    const icon = `/${id}/icons/icon-192.png`;
    const base = `/lab/diag/${id}/`;
    files[`public/lab/diag/${id}/index.html`] = `<!doctype html>
<html lang="en" data-diag="${id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${app.name} storage diagnostic</title>
<link rel="manifest" href="${base}manifest.webmanifest">
<link rel="apple-touch-icon" href="${icon}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${app.name} diag">
<link rel="stylesheet" href="/lab/diag/diag.css">
</head>
<body>
<h1>${app.name} storage diagnostic</h1>
<p>Temporary. It writes a few small marks, shows which marks this install can see, and removes them on request.</p>
<div class="buttons">
<button id="write" type="button">Write marks</button>
<button id="read" type="button">Read</button>
<button id="copy" type="button">Copy results</button>
<button id="save" type="button">Save file</button>
<button id="clean" type="button">Remove marks</button>
</div>
<p id="note" role="status"></p>
<table id="table"></table>
<textarea id="json" aria-label="Results" readonly></textarea>
<script src="/lab/diag/diag.js"></script>
</body>
</html>
`;
    files[`public/lab/diag/${id}/manifest.webmanifest`] = `${JSON.stringify(
      {
        name: `${app.name} storage diagnostic`,
        short_name: `${app.name} diag`,
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: app.tint?.ground ?? '#101010',
        theme_color: app.tint?.ground ?? '#101010',
        icons: [{ src: icon, sizes: '192x192', type: 'image/png' }],
      },
      null,
      2,
    )}\n`;
    files[`public/lab/diag/${id}/sw.js`] = `// Storage diagnostic worker for ${app.name} (temporary). Scope ${base} only; it answers no requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
`;
  }
  return files;
}
