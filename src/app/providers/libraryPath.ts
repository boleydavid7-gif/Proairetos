import { APPS, type AppId, type AppManifest } from '../../core/apps/manifest';

/*
 * Which way the Library is gathered. Off unless this device or this build is switched on: the Library page reads each app's records itself,
 * as it always has. On, the apps that provide `library` are asked through the provider host and the page leaves their own gathering out.
 * Off is immediate and loses nothing: no entry is stored, so going back is only a change of path. Two ways to switch it:
 *   - this device only: `proairetosLibraryProviders` set to `on` (outside the `proairetos.` prefix, so neither synced nor backed up);
 *   - the whole build: the build variable `VITE_LIBRARY_PROVIDERS=on`.
 * It is a rollout switch with no screen; nothing asks the person about it.
 */
const KEY = 'proairetosLibraryProviders';

export function libraryProvidersOn(): boolean {
  if (import.meta.env.VITE_LIBRARY_PROVIDERS === 'on') return true;
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setLibraryProviders(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage may be blocked; the default stays.
  }
}

/** The apps whose entries come through providers (the manifest says which). */
export function providedLibraryApps(manifest: readonly AppManifest[] = APPS): AppId[] {
  return manifest.filter((app) => app.status !== 'retired' && app.provides?.includes('library')).map((app) => app.id);
}
