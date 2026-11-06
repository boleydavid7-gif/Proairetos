import { APPS, type AppId, type AppManifest } from '../../core/apps/manifest';

/*
 * Which way notices are gathered. Through the provider host unless this device or this build is told to go back: the apps' own
 * functions (`familyNotices` and the direct Askesis and Oikonomia reads) are still in place for that. Two ways back, neither a
 * setting the person sees:
 *   - this device only: `proairetosNoticeProviders` set to `off` (outside the `proairetos.` prefix, so neither synced nor backed up);
 *   - the whole build: the build variable `VITE_NOTICE_PROVIDERS=off`, for a rollback without a code change.
 */
const KEY = 'proairetosNoticeProviders';

export function noticeProvidersOn(): boolean {
  if (import.meta.env.VITE_NOTICE_PROVIDERS === 'off') return false;
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setNoticeProviders(on: boolean): void {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    // Storage may be blocked; the default stays.
  }
}

/** The apps whose notices come through providers (the manifest says which). */
export function providedNoticeApps(manifest: readonly AppManifest[] = APPS): AppId[] {
  return manifest.filter((app) => app.status !== 'retired' && app.provides?.includes('notices')).map((app) => app.id);
}
