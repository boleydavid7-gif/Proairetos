// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commonFolder, dropboxArg, filesInCloud } from '../../theoria/data/cloudLibrary';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('cloud library folder', () => {
  it('escapes Dropbox arguments to ASCII and finds the shared folder of paths', () => {
    expect(dropboxArg({ path: '/Bücher/Émile.epub' })).toBe('{"path":"/B\\u00fccher/\\u00c9mile.epub"}');
    expect(commonFolder(['/Books/a.epub', '/Books/b/c.pdf'])).toBe('/Books');
    expect(commonFolder([])).toBe('');
  });

  it('walks a Google Drive folder and its subfolders, leaving Google documents out', async () => {
    localStorage.setItem('theoriaCloud.google', JSON.stringify({ access: 'T', until: Date.now() + 60_000 }));
    const pages: Record<string, unknown> = {
      top: { files: [{ id: 'a', name: 'Meditations.epub', mimeType: 'application/epub+zip', size: '10' }, { id: 'sub', name: 'Stoics', mimeType: 'application/vnd.google-apps.folder' }, { id: 'doc', name: 'Notes', mimeType: 'application/vnd.google-apps.document' }] },
      sub: { files: [{ id: 'b', name: 'Letters.pdf', mimeType: 'application/pdf', size: '20' }] },
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const query = new URL(url).searchParams.get('q') ?? '';
      return new Response(JSON.stringify(query.includes("'sub'") ? pages.sub : pages.top));
    }));
    expect(await filesInCloud({ provider: 'google', id: 'top', name: 'Books' })).toEqual([
      { id: 'a', path: 'Meditations.epub', size: 10, download: undefined },
      { id: 'b', path: 'Stoics/Letters.pdf', size: 20, download: undefined },
    ]);
  });

  it('reads a Dropbox folder in one listing, paths below the chosen folder', async () => {
    localStorage.setItem('theoriaCloud.dropbox', JSON.stringify({ access: 'T', until: Date.now() + 60_000 }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      entries: [
        { '.tag': 'folder', id: 'id:f', name: 'Books', path_display: '/Books' },
        { '.tag': 'file', id: 'id:1', name: 'Meditations.epub', size: 10, path_display: '/Books/Meditations.epub' },
        { '.tag': 'file', id: 'id:2', name: 'Letters.pdf', size: 20, path_display: '/Books/Stoics/Letters.pdf' },
        { '.tag': 'file', id: 'id:3', name: 'x', size: 1, path_display: '/Books/.hidden/x' },
      ],
      cursor: 'c',
      has_more: false,
    }))));
    expect(await filesInCloud({ provider: 'dropbox', id: 'id:f', name: 'Books', path: '/Books' })).toEqual([
      { id: 'id:1', path: 'Meditations.epub', size: 10 },
      { id: 'id:2', path: 'Stoics/Letters.pdf', size: 20 },
    ]);
  });
});

describe('finding a book in the storage', () => {
  it('takes the same name and size, case aside', async () => {
    const { pickMatch } = await import('../../theoria/data/cloudLibrary');
    const found = [{ name: 'meditations.epub', size: 9 }, { name: 'Meditations.epub', size: 10 }, { name: 'Meditations (1).epub', size: 10 }];
    expect(pickMatch(found, 'Meditations.EPUB', 10)).toEqual({ name: 'Meditations.epub', size: 10 });
    expect(pickMatch(found, 'Meditations.epub')).toEqual({ name: 'meditations.epub', size: 9 });
    expect(pickMatch(found, 'Letters.pdf', 10)).toBeUndefined();
  });

  it('searches OneDrive by name and gives the matching file', async () => {
    const { findInCloud } = await import('../../theoria/data/cloudLibrary');
    localStorage.setItem('theoriaCloud.onedrive', JSON.stringify({ access: 'T', until: Date.now() + 60_000 }));
    const fetched: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(url);
      return new Response(JSON.stringify({ value: [{ id: 'x', name: "Marcus's Meditations.epub", size: 5, file: {}, '@microsoft.graph.downloadUrl': 'https://dl/x' }, { id: 'f', name: "Marcus's Meditations.epub", folder: {} }] }));
    }));
    expect(await findInCloud('onedrive', "Marcus's Meditations.epub", 5)).toEqual({ provider: 'onedrive', id: 'x', download: 'https://dl/x' });
    expect(fetched[0]).toContain("search(q='Marcus''s%20Meditations.epub')");
  });
});
