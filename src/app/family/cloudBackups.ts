import { toLocalDate } from '../../core/scheduling/dates';
import { backupText, packBackup } from '../../data/backup/packing';
import { openWithAccount, ownBackupStorage, sealWithAccount, syncStatus } from '../sync/syncController';
import { dailyCopiesOn } from '../../data/backup/daily';
import { countRecords } from '../../data/backup/format';
import { backupService } from '../services';

/*
 * Backups in the person's own storage. While the account syncs through their Google Drive, Dropbox or OneDrive, each
 * day's copy (and any backup saved by hand) also goes into the same Proairetos folder, sealed with the account's key
 * like the records beside it, so another device signed in to the account can restore it and nobody else can read it.
 * The last fourteen days are kept. Nothing goes anywhere while the account syncs through Proairetos's server.
 */

const LABEL = 'proairetos-backup';
const KEEP_DAYS = 14;
/** The last day this device put a copy there; device only (outside `proairetos.`, so not synced or backed up). */
const SENT_DAY = 'proairetosOwnStorageCopy';
const NAME = /^backup-(\d{4}-\d{2}-\d{2})\.sealed$/;
const nameFor = (day: string) => `backup-${day}.sealed`;

/** Seals a backup file's text and puts it in the person's own storage. The storage's name, or null when there is none. */
export async function backupToOwnStorage(text: string, day = toLocalDate(new Date())): Promise<string | null> {
  const own = await ownBackupStorage();
  if (!own) return null;
  const { blob } = await packBackup(text);
  const sealed = await sealWithAccount(LABEL, await blob.arrayBuffer());
  if (!sealed) return null;
  await own.folder.write(nameFor(day), sealed.sealed);
  const days = (await own.folder.list()).map((file) => file.name).filter((name) => NAME.test(name)).sort();
  for (const old of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) await own.folder.remove(old).catch(() => undefined);
  try {
    localStorage.setItem(SENT_DAY, day);
  } catch {
    // Private browsing: the next copy simply goes again.
  }
  return own.name;
}

/** The backups in the person's own storage, newest first; null when the account does not sync through one. */
export async function ownStorageBackups(): Promise<{ storage: string; days: string[] } | null> {
  const own = await ownBackupStorage();
  if (!own) return null;
  const days = (await own.folder.list())
    .map((file) => NAME.exec(file.name)?.[1])
    .filter((day): day is string => Boolean(day))
    .sort()
    .reverse();
  return { storage: own.name, days };
}

/** A day's backup from the person's own storage, opened with the account's key: the backup file's text. */
export async function openOwnStorageBackup(day: string): Promise<string> {
  const own = await ownBackupStorage();
  if (!own) throw new Error('Your storage isn’t reachable right now. Try again.');
  const bytes = await own.folder.read(nameFor(day));
  if (!bytes) throw new Error('That copy isn’t there any more.');
  const opened = await openWithAccount(LABEL, bytes.buffer);
  if (!opened) throw new Error('Couldn’t open that copy on this device. Try again once signed in.');
  return backupText(new Blob([opened]));
}

/** Today's copy into the person's own storage, once a day per device, when daily copies are on and there is something to keep. */
export async function dailyCopyToOwnStorage(): Promise<void> {
  if (!dailyCopiesOn()) return;
  const today = toLocalDate(new Date());
  try {
    if (localStorage.getItem(SENT_DAY) === today) return;
  } catch {
    return;
  }
  if (!(await ownBackupStorage())) return;
  const data = await backupService.exportData();
  if (Object.values(countRecords(data)).every((n) => n === 0)) return;
  await backupToOwnStorage(await backupService.exportFile(), today);
}

let watching = false;

/** Tries after each sync, since the account is often not open yet when the app starts. */
export function watchOwnStorageCopies(): void {
  if (watching) return;
  watching = true;
  let last: string | undefined;
  syncStatus.subscribe(() => {
    const at = syncStatus.get().lastSyncedAt;
    if (!at || at === last) return;
    last = at;
    void dailyCopyToOwnStorage().catch(() => undefined);
  });
}
