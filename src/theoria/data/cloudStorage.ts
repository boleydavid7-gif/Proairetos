import { currentUser, isSyncConfigured, supabase } from '../../data/sync/supabase';

// Book files go to the account only sealed (`cloudCopy.ts`). The signed links below are kept to fetch, once,
// the unsealed files the first version uploaded, so they can be sealed and those removed.

export const THEORIA_BOOK_BUCKET = 'theoria-books';
export const THEORIA_COVER_BUCKET = 'theoria-covers';
export const THEORIA_EXPORT_BUCKET = 'theoria-exports';
export const MAX_BOOK_BYTES = 50 * 1024 * 1024;

const extensions = new Set(['epub', 'pdf', 'txt', 'md']);

export function validateImportFile(file: File): void {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!extensions.has(extension)) throw new Error('Choose an EPUB, PDF, TXT, or Markdown file.');
  if (file.size > MAX_BOOK_BYTES) throw new Error('That file is larger than the 50 MB library limit.');
}

export async function signedBookUrl(path: string, expiresIn = 3600): Promise<string | undefined> {
  if (!isSyncConfigured) return undefined;
  const user = await currentUser();
  if (!user || !path.startsWith(`${user.id}/`)) return undefined;
  const { data, error } = await (await supabase()).storage.from(THEORIA_BOOK_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function signedCoverUrl(path: string, expiresIn = 3600): Promise<string | undefined> {
  if (!isSyncConfigured) return undefined;
  const user = await currentUser();
  if (!user || !path.startsWith(`${user.id}/`)) return undefined;
  const { data, error } = await (await supabase()).storage.from(THEORIA_COVER_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

