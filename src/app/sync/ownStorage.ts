import type { FileStore } from '../../data/sync/attachmentFiles';
import { createFolderFileStore, createFolderRemote, forgetFolder, type CloudFolder, type FolderRemote } from '../../data/sync/folderRemote';
import { openRecord, sealRecord } from '../../data/sync/keys';
import { askForTokens } from '../../data/sync/storageLink';
import { PROVIDER_NAMES, folderFor, type StorageProvider, type TokenSource } from '../../data/sync/storageProviders';
import { NoStorageLinks, fetchStorageLink, saveStorageLink } from '../../data/sync/supabase';
import type { SyncStateStore } from '../../data/sync/types';

/*
 * Where the sealed records sync: Proairetos's server, or the person's own Google Drive, Dropbox or OneDrive. The
 * choice is kept on the server (the refresh token sealed with the account key), so every app and device follows it.
 */

export type StorageTarget = 'proairetos' | StorageProvider;

const TARGET_META = 'storageTarget';
const LINK_FRESH_MS = 5 * 60_000;

type Link = { provider: StorageProvider; refresh: string };

let cached: { at: number; userId: string; link: Link | null } | null = null;
let access: { provider: StorageProvider; token: string; until: number } | null = null;

export const storageName = (target: StorageTarget) => (target === 'proairetos' ? 'Proairetos' : PROVIDER_NAMES[target]);

/** The account's storage link, opened on the device. Null for Proairetos's server (or a server without the table). */
export async function currentLink(userId: string, key: CryptoKey, force = false): Promise<Link | null> {
  if (!force && cached && cached.userId === userId && Date.now() - cached.at < LINK_FRESH_MS) return cached.link;
  let link: Link | null = null;
  try {
    const row = await fetchStorageLink();
    if (row) link = { provider: row.provider, ...(await openRecord<{ refresh: string }>(key, 'storage', 'link', row.sealed)) };
  } catch (cause) {
    if (!(cause instanceof NoStorageLinks)) throw cause;
  }
  cached = { at: Date.now(), userId, link };
  return link;
}

/** Keeps a new connection for the account, sealed. */
export async function keepLink(userId: string, key: CryptoKey, link: Link): Promise<void> {
  await saveStorageLink(userId, { provider: link.provider, sealed: await sealRecord(key, 'storage', 'link', { refresh: link.refresh }) });
  cached = { at: Date.now(), userId, link };
}

export function forgetLink(userId: string): void {
  cached = { at: Date.now(), userId, link: null };
  access = null;
}

/** Hands a just-made access token to the sync that follows, so it is not asked for again at once. */
export function holdAccess(provider: StorageProvider, token: string, expiresIn: number): void {
  access = { provider, token, until: Date.now() + (expiresIn - 60) * 1000 };
}

function tokens(userId: string, key: CryptoKey, link: Link): TokenSource {
  return async (again = false) => {
    if (!again && access?.provider === link.provider && access.until > Date.now()) return access.token;
    const fresh = await askForTokens({ provider: link.provider, refresh: link.refresh });
    holdAccess(link.provider, fresh.access, fresh.expiresIn);
    // Some providers give a new refresh token each time; the account keeps the newest.
    if (fresh.refresh && fresh.refresh !== link.refresh) {
      link.refresh = fresh.refresh;
      await keepLink(userId, key, link).catch(() => undefined);
    }
    return fresh.access;
  };
}

/** What this device last synced through. Devices that synced before there was a choice used Proairetos's server. */
export async function lastTarget(state: SyncStateStore): Promise<StorageTarget> {
  return (await state.getMeta<StorageTarget>(TARGET_META)) ?? 'proairetos';
}

/**
 * The storage changed: what was read from the old one says nothing about the new one. What this device last synced is
 * kept, so its own changes still go up and the account's records come down as usual.
 */
export async function startAfresh(state: SyncStateStore, target: StorageTarget, everything = false): Promise<void> {
  await state.setMeta('cursor', 0);
  await forgetFolder(state);
  await state.setMeta('uploadedFiles', null);
  // The device that moves the account sends all it has, so the new storage starts complete.
  if (everything) for (const k of (await state.fingerprints()).keys()) await state.removeFingerprint(k);
  await state.setMeta(TARGET_META, target);
}

export type OwnStorage = { target: StorageProvider; remote: FolderRemote; files: FileStore };

/** For a sync run: the person's own storage, or null for Proairetos's server. Follows a change made elsewhere. */
export async function ownStorageFor(userId: string, key: CryptoKey, state: SyncStateStore): Promise<OwnStorage | null> {
  const link = await currentLink(userId, key);
  const target: StorageTarget = link?.provider ?? 'proairetos';
  if ((await lastTarget(state)) !== target) await startAfresh(state, target);
  if (!link) return null;
  const folder = folderFor(link.provider, tokens(userId, key, link));
  return { target: link.provider, remote: createFolderRemote({ folder, state }), files: createFolderFileStore(folder) };
}

/** The account's own storage folder, for sealed backups beside the records. Null when it syncs through Proairetos's server. */
export async function ownFolder(userId: string, key: CryptoKey): Promise<{ provider: StorageProvider; folder: CloudFolder } | null> {
  const link = await currentLink(userId, key);
  if (!link) return null;
  return { provider: link.provider, folder: folderFor(link.provider, tokens(userId, key, link)) };
}
