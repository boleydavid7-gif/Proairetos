import { tooOften } from './safeFetch';

/*
 * Bring your own storage: the sign-in step with Google Drive, Dropbox and OneDrive that needs the app's secret.
 * The browser sends the code it was given (with its PKCE verifier) or a refresh token; this passes them to the
 * provider with the secret and returns the tokens. Nothing is stored or logged here. GET says which providers are set up.
 */

export type StorageEnv = {
  // The VITE_ names are the ones Noesis uses; either works, so one set of registrations serves both.
  VITE_GOOGLE_DRIVE_CLIENT_ID?: string;
  VITE_DROPBOX_APP_KEY?: string;
  VITE_ONEDRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_SECRET?: string;
  DROPBOX_APP_KEY?: string;
  DROPBOX_APP_SECRET?: string;
  ONEDRIVE_CLIENT_ID?: string;
  ONEDRIVE_CLIENT_SECRET?: string;
  /** Theoria's library folder in Dropbox reads any folder, which needs a "Full Dropbox" app of its own. */
  DROPBOX_LIBRARY_APP_KEY?: string;
  DROPBOX_LIBRARY_APP_SECRET?: string;
};

type Provider = 'google' | 'dropbox' | 'onedrive';

const TOKEN_URL: Record<Provider, string> = {
  google: 'https://oauth2.googleapis.com/token',
  dropbox: 'https://api.dropboxapi.com/oauth2/token',
  onedrive: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

function client(env: StorageEnv, provider: Provider, library = false): { id: string; secret?: string } | null {
  if (library && provider === 'dropbox' && env.DROPBOX_LIBRARY_APP_KEY?.trim()) {
    return { id: env.DROPBOX_LIBRARY_APP_KEY.trim(), secret: env.DROPBOX_LIBRARY_APP_SECRET?.trim() || undefined };
  }
  const id =
    provider === 'google'
      ? env.GOOGLE_DRIVE_CLIENT_ID || env.VITE_GOOGLE_DRIVE_CLIENT_ID
      : provider === 'dropbox'
        ? env.DROPBOX_APP_KEY || env.VITE_DROPBOX_APP_KEY
        : env.ONEDRIVE_CLIENT_ID || env.VITE_ONEDRIVE_CLIENT_ID;
  const secret = provider === 'google' ? env.GOOGLE_DRIVE_CLIENT_SECRET : provider === 'dropbox' ? env.DROPBOX_APP_SECRET : env.ONEDRIVE_CLIENT_SECRET;
  // Google needs the secret for a web app. Dropbox works without one (PKCE alone). OneDrive without a secret is a
  // "single-page application" registration: the browser trades its tokens itself (`direct`).
  if (!id?.trim() || (!secret?.trim() && provider === 'google')) return null;
  return { id: id.trim(), secret: secret?.trim() || undefined };
}

/** The providers set up on this site, with the public client ids the browser needs to start signing in. */
export function storageProviders(env: StorageEnv): Partial<Record<Provider, string>> {
  const found: Partial<Record<Provider, string>> = {};
  for (const provider of ['google', 'dropbox', 'onedrive'] as const) {
    const known = client(env, provider);
    if (known) found[provider] = known.id;
  }
  return found;
}

/** Providers whose tokens the browser asks for itself (Microsoft refuses a single-page app's tokens from a server). */
export function directProviders(env: StorageEnv): Provider[] {
  const onedrive = client(env, 'onedrive');
  return onedrive && !onedrive.secret ? ['onedrive'] : [];
}

export const ONEDRIVE_SCOPE = 'Files.ReadWrite.AppFolder offline_access';
/** Theoria's library folder: reading the person's chosen OneDrive folder (read only, never writing). */
export const ONEDRIVE_LIBRARY_SCOPE = 'Files.Read offline_access';

export async function handleStorageRequest(request: Request, env: StorageEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return reply(403, { error: 'Not allowed' });
  if (request.method === 'GET') {
    // `library`: the client ids Theoria's library folder signs in with, where they differ from the providers' own.
    const library: Partial<Record<Provider, string>> = {};
    if (env.DROPBOX_LIBRARY_APP_KEY?.trim()) library.dropbox = env.DROPBOX_LIBRARY_APP_KEY.trim();
    return reply(200, { providers: storageProviders(env), direct: directProviders(env), library });
  }
  if (request.method !== 'POST') return reply(405, { error: 'Not allowed' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });

  let body: { provider?: string; code?: string; verifier?: string; refresh?: string; scope?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'Not understood.' });
  }
  const provider = body.provider as Provider;
  if (!(provider in TOKEN_URL)) return reply(400, { error: 'Not understood.' });
  const forLibrary = body.scope === 'library';
  const known = client(env, provider, forLibrary);
  if (!known || directProviders(env).includes(provider)) return reply(503, { error: 'This storage is not set up yet.' });

  const form = new URLSearchParams({ client_id: known.id });
  if (known.secret) form.set('client_secret', known.secret);
  if (body.refresh && typeof body.refresh === 'string' && body.refresh.length < 4000) {
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', body.refresh);
  } else if (typeof body.code === 'string' && typeof body.verifier === 'string' && body.code.length < 4000 && body.verifier.length < 200) {
    form.set('grant_type', 'authorization_code');
    form.set('code', body.code);
    form.set('code_verifier', body.verifier);
    // Only this site's own return page: a code made for another address is refused.
    form.set('redirect_uri', `${url.origin}/storage-connected/`);
  } else {
    return reply(400, { error: 'Not understood.' });
  }
  if (provider === 'onedrive') form.set('scope', body.scope === 'library' ? ONEDRIVE_LIBRARY_SCOPE : ONEDRIVE_SCOPE);

  let upstream: Response;
  try {
    upstream = await fetchImpl(TOKEN_URL[provider], { method: 'POST', body: form, headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' } });
  } catch {
    return reply(502, { error: 'The storage could not be reached. Try again.' });
  }
  const data = (await upstream.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!upstream.ok || !data.access_token) return reply(upstream.status === 400 ? 401 : 502, { error: 'The storage did not accept this sign-in. Connect it again.' });
  return reply(200, { access: data.access_token, refresh: data.refresh_token, expiresIn: data.expires_in ?? 3600 });
}
