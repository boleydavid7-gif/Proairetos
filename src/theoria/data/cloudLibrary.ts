/*
 * Theoria's library folder in the person's cloud storage (OneDrive, Google Drive or Dropbox), so it works on any
 * device or browser: connect once on each device (read only), choose a folder, and Theoria brings in the books there
 * and newer versions of them, each file fetched straight from the storage. The chosen folder is the synced setting
 * `theoria:cloudFolder`, so every device follows the same one; each device's sign-in stays on it
 * (`theoriaCloud.<provider>`, out of backups and sync).
 *
 * Reading folders the person chose needs more than the app-folder registrations "Your own storage" uses: OneDrive
 * `Files.Read`, Google `drive.readonly`, and a Dropbox app with Full Dropbox access (`DROPBOX_LIBRARY_APP_KEY`; with
 * only the app-folder key, Dropbox shows that app folder alone).
 */
import { apiUrl } from '../../app/apiBase';

export type CloudProvider = 'onedrive' | 'google' | 'dropbox';
export const CLOUD_NAMES: Record<CloudProvider, string> = { onedrive: 'OneDrive', google: 'Google Drive', dropbox: 'Dropbox' };

export type CloudFolder = { provider: CloudProvider; id: string; name: string; /** Dropbox: where it is, to read paths below it. */ path?: string };
export type CloudEntry = { id: string; name: string; size: number; isFolder: boolean; path?: string };
export type CloudFile = { id: string; path: string; size: number; download?: string };

type Tokens = { access: string; refresh?: string; until: number };
type Site = { providers: Partial<Record<CloudProvider, string>>; direct: CloudProvider[]; library: Partial<Record<CloudProvider, string>> };

const RETURN_PATH = '/storage-connected/';
const PENDING = 'theoriaCloudPending';
const FOLDER = 'theoria:cloudFolder';
const tokensKey = (provider: CloudProvider) => `theoriaCloud.${provider}`;

const SCOPES: Record<CloudProvider, string> = {
  onedrive: 'Files.Read offline_access',
  google: 'https://www.googleapis.com/auth/drive.readonly',
  dropbox: '',
};
const AUTHORIZE: Record<CloudProvider, string> = {
  onedrive: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  dropbox: 'https://www.dropbox.com/oauth2/authorize',
};

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomText = (length: number) => base64Url(crypto.getRandomValues(new Uint8Array(length)));

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function write(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full: connecting again works.
  }
}

let site: Promise<Site> | undefined;
function siteStorage(): Promise<Site> {
  site ??= fetch(apiUrl('/api/storage'))
    .then((response) => (response.ok ? (response.json() as Promise<Partial<Site>>) : {}))
    .then((data: Partial<Site>) => ({ providers: data.providers ?? {}, direct: data.direct ?? [], library: data.library ?? {} }))
    .catch(() => ({ providers: {}, direct: [], library: {} }));
  return site;
}
const clientId = async (provider: CloudProvider) => {
  const known = await siteStorage();
  return known.library[provider] ?? known.providers[provider];
};

/** The storages this site can connect a library folder to. */
export async function cloudsOffered(): Promise<CloudProvider[]> {
  const known = await siteStorage();
  return (['onedrive', 'google', 'dropbox'] as const).filter((provider) => known.providers[provider] || known.library[provider]);
}

/** Whether Dropbox reaches the whole Dropbox (its own library app) or only the app folder. */
export async function dropboxWhole(): Promise<boolean> {
  return Boolean((await siteStorage()).library.dropbox);
}

export const cloudConnected = (provider: CloudProvider) => Boolean(read<Tokens>(tokensKey(provider)));
export const chosenCloudFolder = () => read<CloudFolder>(FOLDER);
export const chooseCloudFolder = (folder: CloudFolder | undefined) => write(FOLDER, folder);
export const disconnectCloud = (provider: CloudProvider) => write(tokensKey(provider), undefined);

/** Leaves for the storage's sign-in (from a tap); it comes back to Theoria's settings. */
export async function connectCloud(provider: CloudProvider, intent: 'folder' | 'books' = 'folder'): Promise<void> {
  const id = await clientId(provider);
  if (!id) throw new Error(`${CLOUD_NAMES[provider]} is not set up on this site yet.`);
  const verifier = randomText(48);
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = `theoria.${randomText(16)}`;
  write(PENDING, { provider, verifier, state, at: Date.now(), intent });
  const params = new URLSearchParams({ client_id: id, redirect_uri: `${location.origin}${RETURN_PATH}`, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', state });
  if (provider === 'onedrive') {
    params.set('scope', SCOPES.onedrive);
    params.set('response_mode', 'query');
    params.set('prompt', 'select_account');
  } else if (provider === 'google') {
    params.set('scope', SCOPES.google);
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  } else params.set('token_access_type', 'offline');
  location.assign(`${AUTHORIZE[provider]}?${params}`);
}

/** Back from a storage's sign-in: keeps it and says which storage and why. Undefined when the address carried none. */
export async function finishCloud(hash = location.hash): Promise<{ provider: CloudProvider; intent: 'folder' | 'books' } | undefined> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (!params.has('storage') && !params.has('storage-error')) return undefined;
  const pending = read<{ provider: CloudProvider; verifier: string; state: string; at: number; intent?: 'folder' | 'books' }>(PENDING);
  if (!pending || pending.state !== params.get('storage-state')) return undefined;
  history.replaceState(history.state, '', location.pathname + location.search);
  write(PENDING, undefined);
  if (params.get('storage-error')) throw new Error(`Connecting ${CLOUD_NAMES[pending.provider]} was canceled.`);
  if (Date.now() - pending.at > 30 * 60_000) throw new Error(`That took too long. Connect ${CLOUD_NAMES[pending.provider]} again.`);
  await trade(pending.provider, { code: params.get('storage') ?? '', verifier: pending.verifier });
  return { provider: pending.provider, intent: pending.intent ?? 'folder' };
}

async function trade(provider: CloudProvider, body: { code?: string; verifier?: string; refresh?: string }): Promise<Tokens> {
  const known = await siteStorage();
  let response: Response;
  try {
    if (provider === 'onedrive' && known.direct.includes('onedrive')) {
      // A single-page registration: Microsoft takes the trade only from the browser, with no secret.
      const form = new URLSearchParams({ client_id: (await clientId('onedrive')) ?? '', scope: SCOPES.onedrive });
      if (body.refresh) {
        form.set('grant_type', 'refresh_token');
        form.set('refresh_token', body.refresh);
      } else {
        form.set('grant_type', 'authorization_code');
        form.set('code', body.code ?? '');
        form.set('code_verifier', body.verifier ?? '');
        form.set('redirect_uri', `${location.origin}${RETURN_PATH}`);
      }
      response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', body: form });
    } else {
      response = await fetch(apiUrl('/api/storage'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, scope: 'library', ...body }) });
    }
  } catch {
    throw new Error(`${CLOUD_NAMES[provider]} could not be reached. Try again.`);
  }
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; access?: string; refresh?: string; expiresIn?: number };
  const access = data.access_token ?? data.access;
  if (!response.ok || !access) {
    if (response.status === 400 || response.status === 401) disconnectCloud(provider);
    throw new Error(`${CLOUD_NAMES[provider]} did not accept this sign-in. Connect it again.`);
  }
  const tokens: Tokens = { access, refresh: data.refresh_token ?? data.refresh ?? body.refresh, until: Date.now() + ((data.expires_in ?? data.expiresIn ?? 3600) - 120) * 1000 };
  write(tokensKey(provider), tokens);
  return tokens;
}

async function token(provider: CloudProvider): Promise<string> {
  const tokens = read<Tokens>(tokensKey(provider));
  if (!tokens) throw new Error(`Connect ${CLOUD_NAMES[provider]} on this device first.`);
  if (tokens.until > Date.now()) return tokens.access;
  if (!tokens.refresh) throw new Error(`Connect ${CLOUD_NAMES[provider]} again.`);
  return (await trade(provider, { refresh: tokens.refresh })).access;
}

async function call(provider: CloudProvider, url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${await token(provider)}` } });
  if (response.status === 401) {
    const tokens = read<Tokens>(tokensKey(provider));
    if (tokens) write(tokensKey(provider), { ...tokens, until: 0 });
    throw new Error(`${CLOUD_NAMES[provider]} asked to sign in again. Try once more, or connect it again.`);
  }
  if (!response.ok) throw new Error(response.status === 404 || response.status === 409 ? 'That folder is no longer there. Choose it again.' : `${CLOUD_NAMES[provider]} could not be reached. Try again.`);
  return response;
}

/** Dropbox's argument header takes ASCII only; other characters go as \\u escapes. */
export const dropboxArg = (value: unknown) => JSON.stringify(value).replace(/[\u007f-￿]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);

type Listed = { id: string; name: string; size: number; isFolder: boolean; path?: string; download?: string };

/** One level of a folder (`id` absent: the top). Dropbox can also list everything below (`deep`), with paths. */
async function list(provider: CloudProvider, id: string | undefined, deep = false): Promise<Listed[]> {
  const found: Listed[] = [];
  if (provider === 'onedrive') {
    let next: string | undefined = `https://graph.microsoft.com/v1.0${id ? `/me/drive/items/${encodeURIComponent(id)}` : '/me/drive/root'}/children?$top=200&$select=id,name,size,folder,file,@microsoft.graph.downloadUrl`;
    while (next && found.length < 5000) {
      const page = (await (await call(provider, next)).json()) as { value: { id: string; name: string; size?: number; folder?: unknown; file?: unknown; '@microsoft.graph.downloadUrl'?: string }[]; '@odata.nextLink'?: string };
      for (const item of page.value) if (item.folder || item.file) found.push({ id: item.id, name: item.name, size: item.size ?? 0, isFolder: Boolean(item.folder), download: item['@microsoft.graph.downloadUrl'] });
      next = page['@odata.nextLink'];
    }
  } else if (provider === 'google') {
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({ q: `'${(id ?? 'root').replace(/'/g, "\\'")}' in parents and trashed = false`, fields: 'nextPageToken,files(id,name,mimeType,size)', pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
      if (pageToken) query.set('pageToken', pageToken);
      const page = (await (await call(provider, `https://www.googleapis.com/drive/v3/files?${query}`)).json()) as { files: { id: string; name: string; mimeType: string; size?: string }[]; nextPageToken?: string };
      for (const item of page.files) {
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
        // Google's own documents have no file to read; books are ordinary files.
        if (!isFolder && item.mimeType.startsWith('application/vnd.google-apps.')) continue;
        found.push({ id: item.id, name: item.name, size: Number(item.size ?? 0), isFolder });
      }
      pageToken = page.nextPageToken;
    } while (pageToken && found.length < 5000);
  } else {
    const post = (url: string, body: unknown) => call(provider, url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    type Page = { entries: { '.tag': string; id: string; name: string; size?: number; path_display?: string }[]; cursor: string; has_more: boolean };
    let page = (await (await post('https://api.dropboxapi.com/2/files/list_folder', { path: id ?? '', recursive: deep, limit: 2000 })).json()) as Page;
    for (;;) {
      for (const item of page.entries) if (item['.tag'] === 'file' || item['.tag'] === 'folder') found.push({ id: item.id, name: item.name, size: item.size ?? 0, isFolder: item['.tag'] === 'folder', path: item.path_display });
      if (!page.has_more || found.length >= 10000) break;
      page = (await (await post('https://api.dropboxapi.com/2/files/list_folder/continue', { cursor: page.cursor })).json()) as Page;
    }
  }
  return found;
}

/** One level of the storage, folders first, for choosing the library folder. */
export async function browseCloud(provider: CloudProvider, id?: string): Promise<CloudEntry[]> {
  return (await list(provider, id))
    .filter((item) => !item.name.startsWith('.'))
    .map(({ id: itemId, name, size, isFolder, path }) => ({ id: itemId, name, size, isFolder, path }))
    .sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Every file in the chosen folder and below, with its path inside the folder. */
export async function filesInCloud(folder: CloudFolder): Promise<CloudFile[]> {
  if (folder.provider === 'dropbox') {
    // One recursive listing; paths are made relative to the chosen folder.
    const items = await list('dropbox', folder.id, true);
    const top = items.find((item) => item.id === folder.id)?.path;
    const files = items.filter((item) => !item.isFolder && item.path && !item.path.split('/').some((part) => part.startsWith('.')));
    const base = folder.path ?? top ?? commonFolder(files.map((item) => item.path!));
    return files.slice(0, 3000).map((item) => ({ id: item.id, path: item.path!.slice(base.length).replace(/^\//, ''), size: item.size }));
  }
  const found: CloudFile[] = [];
  const walk = async (id: string, prefix: string, depth: number) => {
    if (depth > 6) return;
    for (const item of await list(folder.provider, id)) {
      if (item.name.startsWith('.') || found.length >= 3000) continue;
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isFolder) await walk(item.id, path, depth + 1);
      else found.push({ id: item.id, path, size: item.size, download: item.download });
    }
  };
  await walk(folder.id, '', 0);
  return found;
}

/** The folder all these paths sit in ("/Books/a.epub", "/Books/b/c.pdf" → "/Books"). */
export function commonFolder(paths: readonly string[]): string {
  if (!paths.length) return '';
  const parts = paths.map((path) => path.split('/').slice(0, -1));
  const shared: string[] = [];
  for (let at = 0; at < parts[0].length; at += 1) {
    if (parts.every((each) => each[at] === parts[0][at])) shared.push(parts[0][at]);
    else break;
  }
  return shared.join('/');
}

/** A file's bytes, straight from the storage. */
export async function downloadCloudFile(provider: CloudProvider, file: Pick<CloudFile, 'id' | 'download'>, name: string): Promise<File> {
  let response: Response;
  if (provider === 'onedrive') {
    response = file.download ? await fetch(file.download) : await call(provider, `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.id)}/content`);
  } else if (provider === 'google') {
    response = await call(provider, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`);
  } else {
    response = await call(provider, 'https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: { 'Dropbox-API-Arg': dropboxArg({ path: file.id }) } });
  }
  if (!response.ok) throw new Error(`${CLOUD_NAMES[provider]} did not give the file.`);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type });
}

/** The storages this device is signed in to, OneDrive first. */
export const connectedClouds = (): CloudProvider[] => (['onedrive', 'google', 'dropbox'] as const).filter((provider) => cloudConnected(provider));

export type CloudPlace = { provider: CloudProvider; id: string; download?: string };

/** The file of that name (and size, when known) in the storage, wherever it is; undefined when none matches. */
export async function findInCloud(provider: CloudProvider, name: string, size?: number): Promise<CloudPlace | undefined> {
  type Found = { id: string; name: string; size?: number; download?: string };
  let found: Found[] = [];
  if (provider === 'onedrive') {
    const query = encodeURIComponent(name.replace(/'/g, "''"));
    const page = (await (await call(provider, `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${query}')?$top=50&$select=id,name,size,file,@microsoft.graph.downloadUrl`)).json()) as { value: { id: string; name: string; size?: number; file?: unknown; '@microsoft.graph.downloadUrl'?: string }[] };
    found = page.value.filter((item) => item.file).map((item) => ({ id: item.id, name: item.name, size: item.size, download: item['@microsoft.graph.downloadUrl'] }));
  } else if (provider === 'google') {
    const query = new URLSearchParams({ q: `name = '${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and trashed = false`, fields: 'files(id,name,size,mimeType)', pageSize: '50', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
    const page = (await (await call(provider, `https://www.googleapis.com/drive/v3/files?${query}`)).json()) as { files: { id: string; name: string; size?: string }[] };
    found = page.files.map((item) => ({ id: item.id, name: item.name, size: item.size === undefined ? undefined : Number(item.size) }));
  } else {
    const response = await call(provider, 'https://api.dropboxapi.com/2/files/search_v2', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: name, options: { filename_only: true, max_results: 50 } }) });
    const page = (await response.json()) as { matches: { metadata: { metadata: { '.tag': string; id: string; name: string; size?: number } } }[] };
    found = page.matches.map((match) => match.metadata.metadata).filter((item) => item['.tag'] === 'file').map((item) => ({ id: item.id, name: item.name, size: item.size }));
  }
  const match = pickMatch(found, name, size);
  return match ? { provider, id: match.id, download: match.download } : undefined;
}

/** The same name (case aside), and the same size when the book's size is known. */
export function pickMatch<T extends { name: string; size?: number }>(found: readonly T[], name: string, size?: number): T | undefined {
  const named = found.filter((item) => item.name.toLowerCase() === name.toLowerCase());
  return size ? named.find((item) => item.size === size) : named[0];
}
