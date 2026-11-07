import { APPS, type AppManifest } from './manifest';
import type { Findings } from './validate';

/*
 * What an app needs on disk. A missing runtime asset (its page, its web manifest, its icon, its worker, the
 * notification icon when it has reminders) is an error. A missing optional asset (more icon sizes, screenshots, a front
 * page, shortcuts, a place in a check) is a warning. The files are asked for through `Files`, so the same check runs in a
 * test and in `npm run apps:check`.
 */

export type Files = {
  exists(path: string): boolean;
  list(dir: string): string[];
  readJson(path: string): Record<string, unknown> | undefined;
};

const pub = (app: AppManifest, file: string) => (app.status === 'main' ? `public/${file}` : `public/${app.id}/${file}`);
const png = (app: AppManifest, name: string) => (app.status === 'main' ? `public/icons/${name}` : `public/${app.id}/icons/${name}`);

export function checkAssets(files: Files, apps: readonly AppManifest[] = APPS): Findings {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const app of apps) {
    const at = app.id;
    if (!files.exists(app.urls.entry)) errors.push(`${at}: its page ${app.urls.entry} is missing`);
    const manifestPath = pub(app, 'manifest.webmanifest');
    const web = files.readJson(manifestPath);
    if (!web) errors.push(`${at}: ${manifestPath} is missing or unreadable`);
    else {
      // A web manifest with no scope takes the folder of its start_url.
      const startUrl = typeof web.start_url === 'string' ? web.start_url : '';
      const scope = typeof web.scope === 'string' ? web.scope : startUrl.slice(0, startUrl.lastIndexOf('/') + 1);
      if (scope !== app.urls.scope) errors.push(`${at}: its web manifest scope is ${scope}, expected ${app.urls.scope}`);
      if (typeof web.start_url !== 'string' || !web.start_url.startsWith(app.urls.href)) errors.push(`${at}: its start_url does not begin with ${app.urls.href}`);
      if (!Array.isArray(web.shortcuts) || !web.shortcuts.length) warnings.push(`${at}: its web manifest has no shortcuts`);
    }
    if (app.status === 'retired') continue;
    if (!files.exists(`public${app.icon}`)) errors.push(`${at}: its icon public${app.icon} is missing`);
    if (app.install.worker === 'own' && !files.exists(pub(app, 'sw.js'))) errors.push(`${at}: its worker ${pub(app, 'sw.js')} is missing`);
    const hasNotices = Boolean(app.notices.source);
    if (!files.exists(png(app, 'icon-192.png'))) (hasNotices ? errors : warnings).push(`${at}: ${png(app, 'icon-192.png')} is missing${hasNotices ? ' (reminders show it)' : ''}`);
    for (const name of ['icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
      if (!files.exists(png(app, name))) warnings.push(`${at}: ${png(app, name)} is missing`);
    }
    const shots = files.list(pub(app, 'screenshots')).filter((name) => /^narrow-\d+\.webp$/.test(name)).length;
    const wanted = app.details?.shots ?? 0;
    if (app.details && shots !== wanted) warnings.push(`${at}: ${shots} screenshots on disk, ${wanted} in the manifest`);
    if (app.install.addable && !files.exists(`public/welcome/${app.id}/index.html`)) warnings.push(`${at}: no front page (public/welcome/${app.id}/)`);
    if (app.status === 'active') {
      for (const [check, label] of [['speed', 'speed check'], ['layout', 'layout check'], ['visual', 'visual check'], ['alone', 'alone check']] as const) {
        if (!app.surfaces[check]) warnings.push(`${at}: not in the ${label}`);
      }
    }
  }
  return { errors, warnings };
}
