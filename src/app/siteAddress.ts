/** Where Proairetos lives. */
export const SITE_URL = 'https://proairetos.com';

/**
 * The first address, on workers.dev. Browsers keep each address's data
 * apart, so things saved there stay there until the person brings them
 * across with a backup.
 */
export function isOldAddress(hostname: string = window.location.hostname): boolean {
  return hostname.endsWith('.workers.dev');
}
