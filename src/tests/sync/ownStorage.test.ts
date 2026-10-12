import { authorizeUrl } from '../../data/sync/storageLink';
import { handleStorageRequest, storageProviders } from '../../../worker/storageToken';
import { resetRateLimit } from '../../../worker/safeFetch';

const env = {
  GOOGLE_DRIVE_CLIENT_ID: 'g-id',
  GOOGLE_DRIVE_CLIENT_SECRET: 'g-secret',
  DROPBOX_APP_KEY: 'd-key',
  ONEDRIVE_CLIENT_ID: 'o-id',
};

const post = (body: unknown, origin = 'https://proairetos.com') =>
  new Request('https://proairetos.com/api/storage', { method: 'POST', body: JSON.stringify(body), headers: { origin, 'content-type': 'application/json' } });

describe('your own storage', () => {
  beforeEach(() => resetRateLimit());

  it('offers only the providers set up in full', () => {
    // OneDrive has no secret here, so it is not offered; Dropbox needs none.
    expect(storageProviders(env)).toEqual({ google: 'g-id', dropbox: 'd-key' });
  });

  it('asks each provider for one private folder, with PKCE', () => {
    const google = new URL(authorizeUrl('google', 'g-id', 'CH', 'ST', 'https://proairetos.com'));
    expect(google.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.appdata');
    expect(google.searchParams.get('access_type')).toBe('offline');
    expect(google.searchParams.get('code_challenge_method')).toBe('S256');
    expect(google.searchParams.get('redirect_uri')).toBe('https://proairetos.com/storage-connected/');
    const dropbox = new URL(authorizeUrl('dropbox', 'd-key', 'CH', 'ST', 'https://proairetos.com'));
    expect(dropbox.searchParams.get('token_access_type')).toBe('offline');
    const onedrive = new URL(authorizeUrl('onedrive', 'o-id', 'CH', 'ST', 'https://proairetos.com'));
    expect(onedrive.searchParams.get('scope')).toBe('Files.ReadWrite.AppFolder offline_access');
  });

  it('adds the secret and this site’s own return page, and passes back only the tokens', async () => {
    let sent: URLSearchParams | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      sent = new URLSearchParams(String(init.body));
      return new Response(JSON.stringify({ access_token: 'A', refresh_token: 'R', expires_in: 3599, id_token: 'not passed on' }));
    }) as unknown as typeof fetch;
    const response = await handleStorageRequest(post({ provider: 'google', code: 'C', verifier: 'V' }), env, fake);
    expect(await response.json()).toEqual({ access: 'A', refresh: 'R', expiresIn: 3599 });
    expect(sent?.get('client_secret')).toBe('g-secret');
    expect(sent?.get('code_verifier')).toBe('V');
    expect(sent?.get('redirect_uri')).toBe('https://proairetos.com/storage-connected/');
  });

  it('refuses other sites, unknown providers and a refused sign-in', async () => {
    const fake = (async () => new Response('{}', { status: 400 })) as unknown as typeof fetch;
    expect((await handleStorageRequest(post({ provider: 'google', code: 'C', verifier: 'V' }, 'https://elsewhere.example'), env, fake)).status).toBe(403);
    expect((await handleStorageRequest(post({ provider: 'box', code: 'C', verifier: 'V' }), env, fake)).status).toBe(400);
    expect((await handleStorageRequest(post({ provider: 'onedrive', refresh: 'R' }), env, fake)).status).toBe(503);
    expect((await handleStorageRequest(post({ provider: 'dropbox', refresh: 'R' }), env, fake)).status).toBe(401);
  });
});
