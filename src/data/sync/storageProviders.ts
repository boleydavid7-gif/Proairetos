import type { CloudFolder } from './folderRemote';

/*
 * The person's own storage, each as a flat folder private to the app: Google Drive's app data folder, Dropbox's
 * app folder, OneDrive's app folder. Only sealed bytes are written; the file names say nothing about the content.
 */

export type StorageProvider = 'google' | 'dropbox' | 'onedrive';

export const PROVIDER_NAMES: Record<StorageProvider, string> = { google: 'Google Drive', dropbox: 'Dropbox', onedrive: 'OneDrive' };

/** A fresh access token; `again` asks for a new one when the last was refused. */
export type TokenSource = (again?: boolean) => Promise<string>;

async function authed(token: TokenSource, url: string, init: RequestInit = {}): Promise<Response> {
  const send = async (again: boolean) => {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${await token(again)}`);
    return fetch(url, { ...init, headers });
  };
  const first = await send(false);
  return first.status === 401 ? send(true) : first;
}

async function ok(response: Response, what: string): Promise<Response> {
  if (response.ok) return response;
  throw new Error(`${what} did not work (${response.status}). Try again in a moment.`);
}

const bytesOf = async (response: Response) => new Uint8Array(await response.arrayBuffer());

// ---------- Google Drive (app data folder, scope drive.appdata) ----------

export function googleFolder(token: TokenSource): CloudFolder {
  const api = 'https://www.googleapis.com/drive/v3/files';
  const upload = 'https://www.googleapis.com/upload/drive/v3/files';
  let ids = new Map<string, string>();

  async function list() {
    const found: { name: string; version: string; id: string }[] = [];
    let page = '';
    do {
      const query = new URLSearchParams({ spaces: 'appDataFolder', fields: 'nextPageToken,files(id,name,version)', pageSize: '1000' });
      if (page) query.set('pageToken', page);
      const data = (await (await ok(await authed(token, `${api}?${query}`), 'Reading Google Drive')).json()) as {
        nextPageToken?: string;
        files: { id: string; name: string; version: string }[];
      };
      found.push(...data.files.map((file) => ({ name: file.name, version: file.version, id: file.id })));
      page = data.nextPageToken ?? '';
    } while (page);
    ids = new Map(found.map((file) => [file.name, file.id]));
    return found;
  }

  async function idOf(name: string): Promise<string | undefined> {
    if (!ids.has(name)) await list();
    return ids.get(name);
  }

  return {
    list: () => list().then((files) => files.map(({ name, version }) => ({ name, version }))),
    async read(name) {
      const id = await idOf(name);
      if (!id) return null;
      const response = await authed(token, `${api}/${id}?alt=media`);
      if (response.status === 404) return null;
      return bytesOf(await ok(response, 'Reading Google Drive'));
    },
    async write(name, bytes) {
      const id = await idOf(name);
      if (id) {
        await ok(await authed(token, `${upload}/${id}?uploadType=media`, { method: 'PATCH', body: bytes, headers: { 'content-type': 'application/octet-stream' } }), 'Saving to Google Drive');
        return;
      }
      const boundary = `proairetos${crypto.randomUUID().replace(/-/g, '')}`;
      const head = `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: ['appDataFolder'] })}\r\n--${boundary}\r\ncontent-type: application/octet-stream\r\n\r\n`;
      const body = new Blob([head, bytes, `\r\n--${boundary}--`]);
      const response = await ok(
        await authed(token, `${upload}?uploadType=multipart&fields=id`, { method: 'POST', body, headers: { 'content-type': `multipart/related; boundary=${boundary}` } }),
        'Saving to Google Drive',
      );
      ids.set(name, ((await response.json()) as { id: string }).id);
    },
    async remove(name) {
      const id = await idOf(name);
      if (!id) return;
      const response = await authed(token, `${api}/${id}`, { method: 'DELETE' });
      if (response.status !== 404) await ok(response, 'Tidying Google Drive');
      ids.delete(name);
    },
  };
}

// ---------- Dropbox (app folder) ----------

export function dropboxFolder(token: TokenSource): CloudFolder {
  const api = 'https://api.dropboxapi.com/2/files';
  const content = 'https://content.dropboxapi.com/2/files';
  const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

  return {
    async list() {
      const found: { name: string; version: string }[] = [];
      type Page = { entries: { '.tag': string; name: string; rev?: string }[]; cursor: string; has_more: boolean };
      let page = (await (await ok(await authed(token, `${api}/list_folder`, json({ path: '', limit: 2000 })), 'Reading Dropbox')).json()) as Page;
      for (;;) {
        for (const entry of page.entries) if (entry['.tag'] === 'file') found.push({ name: entry.name, version: entry.rev ?? '' });
        if (!page.has_more) return found;
        page = (await (await ok(await authed(token, `${api}/list_folder/continue`, json({ cursor: page.cursor })), 'Reading Dropbox')).json()) as Page;
      }
    },
    async read(name) {
      const response = await authed(token, `${content}/download`, { method: 'POST', headers: { 'dropbox-api-arg': JSON.stringify({ path: `/${name}` }) } });
      if (response.status === 409) return null;
      return bytesOf(await ok(response, 'Reading Dropbox'));
    },
    async write(name, bytes) {
      await ok(
        await authed(token, `${content}/upload`, {
          method: 'POST',
          body: bytes,
          headers: { 'content-type': 'application/octet-stream', 'dropbox-api-arg': JSON.stringify({ path: `/${name}`, mode: 'overwrite', mute: true }) },
        }),
        'Saving to Dropbox',
      );
    },
    async remove(name) {
      const response = await authed(token, `${api}/delete_v2`, json({ path: `/${name}` }));
      if (response.status !== 409) await ok(response, 'Tidying Dropbox');
    },
  };
}

// ---------- OneDrive (app folder, Microsoft Graph) ----------

export function onedriveFolder(token: TokenSource): CloudFolder {
  const root = 'https://graph.microsoft.com/v1.0/me/drive/special/approot';
  const item = (name: string) => `${root}:/${encodeURIComponent(name)}:`;
  // A simple upload takes up to 4 MB; larger files go up in pieces (a multiple of 320 KiB each).
  const SIMPLE = 4_000_000;
  const PIECE = 320 * 1024 * 12;

  return {
    async list() {
      const found: { name: string; version: string }[] = [];
      let next: string | undefined = `${root}/children?$select=name,eTag,file&$top=999`;
      while (next) {
        const response = await authed(token, next);
        // The app folder is made on first write; until then there is nothing in it.
        if (response.status === 404) return found;
        const data = (await (await ok(response, 'Reading OneDrive')).json()) as { value: { name: string; eTag: string; file?: unknown }[]; '@odata.nextLink'?: string };
        for (const entry of data.value) if (entry.file) found.push({ name: entry.name, version: entry.eTag });
        next = data['@odata.nextLink'];
      }
      return found;
    },
    async read(name) {
      const response = await authed(token, `${item(name)}/content`);
      if (response.status === 404) return null;
      return bytesOf(await ok(response, 'Reading OneDrive'));
    },
    async write(name, bytes) {
      if (bytes.byteLength <= SIMPLE) {
        await ok(await authed(token, `${item(name)}/content`, { method: 'PUT', body: bytes, headers: { 'content-type': 'application/octet-stream' } }), 'Saving to OneDrive');
        return;
      }
      const session = (await (
        await ok(
          await authed(token, `${item(name)}/createUploadSession`, {
            method: 'POST',
            body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
            headers: { 'content-type': 'application/json' },
          }),
          'Saving to OneDrive',
        )
      ).json()) as { uploadUrl: string };
      for (let start = 0; start < bytes.byteLength; start += PIECE) {
        const end = Math.min(start + PIECE, bytes.byteLength);
        // The upload address carries its own permission; no sign-in header goes with it.
        await ok(
          await fetch(session.uploadUrl, { method: 'PUT', body: bytes.slice(start, end), headers: { 'content-range': `bytes ${start}-${end - 1}/${bytes.byteLength}` } }),
          'Saving to OneDrive',
        );
      }
    },
    async remove(name) {
      const response = await authed(token, item(name), { method: 'DELETE' });
      if (response.status !== 404) await ok(response, 'Tidying OneDrive');
    },
  };
}

export function folderFor(provider: StorageProvider, token: TokenSource): CloudFolder {
  return provider === 'google' ? googleFolder(token) : provider === 'dropbox' ? dropboxFolder(token) : onedriveFolder(token);
}
