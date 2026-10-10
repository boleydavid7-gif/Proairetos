import { isSyncConfigured, supabase } from '../../data/sync/supabase';
import { openWithAccount, sealWithAccount } from '../../app/sync/syncController';
import { MAX_BOOK_BYTES, signedBookUrl, signedCoverUrl, THEORIA_BOOK_BUCKET, THEORIA_COVER_BUCKET } from './cloudStorage';

/*
 * A book's copy in the account, only if the person chooses it: the file (and its cover) sealed with their key
 * on this device first, like photos on items. The server keeps bytes it cannot read.
 */
export type SealedKind = 'book' | 'cover';

const bucket = (kind: SealedKind) => (kind === 'book' ? THEORIA_BOOK_BUCKET : THEORIA_COVER_BUCKET);
const label = (kind: SealedKind, bookId: string) => `theoria:${kind}:${bookId}`;

export async function uploadSealed(kind: SealedKind, bookId: string, blob: Blob): Promise<string> {
  if (!isSyncConfigured) throw new Error('This copy of the site has no account storage.');
  if (blob.size > MAX_BOOK_BYTES) throw new Error('That file is larger than 50 MB, so it stays on this device only.');
  const result = await sealWithAccount(label(kind, bookId), await blob.arrayBuffer());
  if (!result) throw new Error('Sign in and unlock sync to keep a copy in your account.');
  const path = `${result.userId}/${bookId}/${kind}.sealed`;
  const { error } = await (await supabase()).storage.from(bucket(kind)).upload(path, new Blob([result.sealed], { type: 'application/octet-stream' }), { upsert: true, contentType: 'application/octet-stream' });
  if (error) throw new Error(error.message);
  return path;
}

export async function downloadSealed(kind: SealedKind, bookId: string, path: string, type = ''): Promise<Blob> {
  const { data, error } = await (await supabase()).storage.from(bucket(kind)).download(path);
  if (error || !data) throw new Error(error?.message ?? 'The copy could not be fetched.');
  const opened = await openWithAccount(label(kind, bookId), await data.arrayBuffer());
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
  await (await supabase()).storage.from(bucket(kind)).remove([path]).catch(() => undefined);
}
