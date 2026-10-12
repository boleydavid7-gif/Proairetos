import type { StorageProvider } from './storageProviders';

/*
 * Connecting the person's own storage: they allow Proairetos one private folder in their Google Drive, Dropbox or
 * OneDrive (never the rest of their files), and come back to the account page with a code. PKCE keeps the code
 * useless to anyone else; the site's Worker adds the provider's secret to turn it into tokens.
 */

// The same scope the Worker asks for when it refreshes a OneDrive token (worker/storageToken.ts).
const ONEDRIVE_SCOPE = 'Files.ReadWrite.AppFolder offline_access';
const PENDING = 'storageConnect';
const RETURN_PATH = '/storage-connected/';

export type StorageTokens = { access: string; refresh?: string; expiresIn: number };

let known: Promise<Partial<Record<StorageProvider, string>>> | null = null;

/** The providers this site has set up, with their public client ids. None when the server has none. */
export function storageProvidersHere(): Promise<Partial<Record<StorageProvider, string>>> {
  known ??= fetch('/api/storage')
    .then((response) => (response.ok ? (response.json() as Promise<{ providers?: Partial<Record<StorageProvider, string>> }>) : {}))
    .then((data) => ('providers' in data ? (data.providers ?? {}) : {}))
    .catch(() => ({}));
  return known;
}

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomText = (length: number) => base64Url(crypto.getRandomValues(new Uint8Array(length)));

export function authorizeUrl(provider: StorageProvider, clientId: string, challenge: string, state: string, origin = location.origin): string {
  const redirect = `${origin}${RETURN_PATH}`;
  const common = { client_id: clientId, redirect_uri: redirect, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', state };
  if (provider === 'google') {
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      ...common,
      scope: 'https://www.googleapis.com/auth/drive.appdata',
      access_type: 'offline',
      prompt: 'consent',
    })}`;
  }
  if (provider === 'dropbox') return `https://www.dropbox.com/oauth2/authorize?${new URLSearchParams({ ...common, token_access_type: 'offline' })}`;
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({ ...common, scope: ONEDRIVE_SCOPE, response_mode: 'query' })}`;
}

/** Leaves for the provider's page; it comes back to the account page. Call it from a tap. */
export async function startConnect(provider: StorageProvider): Promise<void> {
  const clientId = (await storageProvidersHere())[provider];
  if (!clientId) throw new Error('This storage is not set up yet.');
  const verifier = randomText(48);
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = randomText(16);
  localStorage.setItem(PENDING, JSON.stringify({ provider, verifier, state, at: Date.now() }));
  location.assign(authorizeUrl(provider, clientId, challenge, state));
}

/** Whether the address carries a return from connecting storage. */
export function connectReturn(hash = location.hash): URLSearchParams | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.has('storage') || params.has('storage-error') ? params : null;
}

/** Back from the provider: the tokens, or why not. Tidies the address and the pending step either way. */
export async function finishConnect(params: URLSearchParams): Promise<{ provider: StorageProvider; tokens: StorageTokens }> {
  history.replaceState(history.state, '', location.pathname + location.search);
  const raw = localStorage.getItem(PENDING);
  localStorage.removeItem(PENDING);
  const pending = raw ? (JSON.parse(raw) as { provider: StorageProvider; verifier: string; state: string; at: number }) : null;
  if (params.get('storage-error')) throw new Error('Connecting was cancelled.');
  if (!pending || pending.state !== params.get('storage-state') || Date.now() - pending.at > 30 * 60_000) {
    throw new Error('That connection did not finish. Try again.');
  }
  return { provider: pending.provider, tokens: await askForTokens({ provider: pending.provider, code: params.get('storage') ?? '', verifier: pending.verifier }) };
}

export async function askForTokens(body: { provider: StorageProvider; code?: string; verifier?: string; refresh?: string }): Promise<StorageTokens> {
  const response = await fetch('/api/storage', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  const data = (await response.json().catch(() => ({}))) as Partial<StorageTokens> & { error?: string };
  if (response.status === 401) throw new StorageRefused(data.error ?? 'The storage did not accept this sign-in. Connect it again.');
  if (!response.ok || !data.access) throw new Error(data.error ?? 'The storage could not be reached. Try again.');
  return { access: data.access, refresh: data.refresh, expiresIn: data.expiresIn ?? 3600 };
}

/** The storage no longer accepts this connection (revoked, or the password changed): it needs connecting again. */
export class StorageRefused extends Error {}
