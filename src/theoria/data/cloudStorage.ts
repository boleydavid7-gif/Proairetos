import { currentUser, isSyncConfigured, supabase } from '../../data/sync/supabase';

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

/** Uploads a private source beneath the signed-in person's folder. */
export async function uploadBookFile(bookId: string, file: File): Promise<{ path: string }> {
  validateImportFile(file);
  if (!isSyncConfigured) throw new Error('Cloud storage is not configured on this deployment.');
  const user = await currentUser();
  if (!user) throw new Error('Sign in to store a book in the cloud.');
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${user.id}/${bookId}/original.${extension}`;
  const { error } = await (await supabase()).storage.from(THEORIA_BOOK_BUCKET).upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(error.message);
  return { path };
}

export async function signedBookUrl(path: string, expiresIn = 3600): Promise<string | undefined> {
  if (!isSyncConfigured) return undefined;
  const user = await currentUser();
  if (!user || !path.startsWith(`${user.id}/`)) return undefined;
  const { data, error } = await (await supabase()).storage.from(THEORIA_BOOK_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeBookFile(path: string): Promise<void> {
  if (!isSyncConfigured) return;
  const user = await currentUser();
  if (!user || !path.startsWith(`${user.id}/`)) return;
  await (await supabase()).storage.from(THEORIA_BOOK_BUCKET).remove([path]);
}
