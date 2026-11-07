import { isSyncConfigured, supabase } from '../../data/sync/supabase';
import { openWithAccount, ownBackupStorage, sealWithAccount } from '../../app/sync/syncController';
import { MAX_BOOK_BYTES, signedBookUrl, signedCoverUrl, THEORIA_BOOK_BUCKET, THEORIA_COVER_BUCKET } from './cloudStorage';

/*
 * A book's copy for the person's other devices: the file (and its cover) sealed with their key on this device
 * first, then kept in their own Google Drive, Dropbox or OneDrive (the folder the account syncs through), as
 * `book-<id>.sealed` / `cover-<id>.sealed`, with the path `own:<name>`. Books are large, so they never go to the
 * site's server any more; copies the first versions kept there are still read, and moved or removed by
 * `moveServerCopies` (library.ts).
 */
export type SealedKind = 'book' | 'cover';

const bucket = (kind: SealedKind) => (kind === 'book' ? THEORIA_BOOK_BUCKET : THEORIA_COVER_BUCKET);
const label = (kind: SealedKind, bookId: string) => `theoria:${kind}:${bookId}`;

/** A server without Theoria's storage (migration 20261014000000) answers "Bucket not found"; say so plainly. */
function plain(message: string): string {
  return /bucket not found/i.test(message) ? 'Account copies are not set up on the server yet. The book stays on this device.' : message;
}

const OWN = 'own:';
export const inOwnStorage = (path: string | undefined) => !!path?.startsWith(OWN);
const ownName = (kind: SealedKind, bookId: string) => `${kind}-${bookId}.sealed`;

/** Said when there is no storage of the person's own to keep the copy in. */
export const NO_OWN_STORAGE = 'Copies of books go to your own Google Drive, Dropbox or OneDrive. Choose one in Proairetos › Account › Where it syncs.';

export async function uploadSealed(kind: SealedKind, bookId: string, blob: Blob): Promise<string> {
  if (!isSyncConfigured) throw new Error('This copy of the site has no account storage.');
  if (blob.size > MAX_BOOK_BYTES) throw new Error('That file is larger than 50 MB, so it stays on this device only.');
  const own = await ownBackupStorage();
  if (!own) throw new Error(NO_OWN_STORAGE);
  const result = await sealWithAccount(label(kind, bookId), await blob.arrayBuffer());
  if (!result) throw new Error('Sign in and unlock sync to keep a copy.');
  await own.folder.write(ownName(kind, bookId), result.sealed);
  return OWN + ownName(kind, bookId);
}

async function sealedBytes(kind: SealedKind, path: string): Promise<ArrayBuffer> {
  if (inOwnStorage(path)) {
    const own = await ownBackupStorage();
    if (!own) throw new Error('Sign in and unlock sync on this device to fetch the copy from your storage.');
    const bytes = await own.folder.read(path.slice(OWN.length));
    if (!bytes) throw new Error('The copy isn’t in your storage.');
    return bytes.slice().buffer;
  }
  const { data, error } = await (await supabase()).storage.from(bucket(kind)).download(path);
  if (error || !data) throw new Error(error ? plain(error.message) : 'The copy could not be fetched.');
  return data.arrayBuffer();
}

export async function downloadSealed(kind: SealedKind, bookId: string, path: string, type = ''): Promise<Blob> {
  const opened = await openWithAccount(label(kind, bookId), await sealedBytes(kind, path));
  if (!opened) throw new Error('Unlock sync on this device to open the copy.');
  return new Blob([opened], { type });
}

/** Files kept unsealed by the first version: fetched once, so they can be kept here and sealed. */
export async function downloadPlain(kind: SealedKind, path: string): Promise<Blob | undefined> {
  const url = kind === 'book' ? await signedBookUrl(path) : await signedCoverUrl(path);
  if (!url) return undefined;
  const response = await fetch(url);
  return response.ok ? response.blob() : undefined;
}

export async function removeFromAccount(kind: SealedKind, path: string): Promise<void> {
  if (!isSyncConfigured) return;
  if (inOwnStorage(path)) {
    const own = await ownBackupStorage().catch(() => null);
    await own?.folder.remove(path.slice(OWN.length)).catch(() => undefined);
    return;
  }
  await (await supabase()).storage.from(bucket(kind)).remove([path]).catch(() => undefined);
}
