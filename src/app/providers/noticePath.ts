import { APPS, type AppId, type AppManifest } from '../../core/apps/manifest';

/*
 * Which way notices are gathered. Off unless this device is switched on: the notices come from the apps' own functions
 * (`familyNotices`), as they always have. On, apps that provide notices are asked through the provider host instead.
 * Device only, outside the `proairetos.` prefix, so it is neither synced nor backed up, and it has no screen: it is a
 * rollout switch, not a setting, and nothing asks the person about it.
 */
const KEY = 'proairetosNoticeProviders';

export function noticeProvidersOn(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setNoticeProviders(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage may be blocked; the old way stays.
  }
}

/** The apps whose notices come through providers (the manifest says which). */
export function providedNoticeApps(manifest: readonly AppManifest[] = APPS): AppId[] {
  return manifest.filter((app) => app.status !== 'retired' && app.provides?.includes('notices')).map((app) => app.id);
}
