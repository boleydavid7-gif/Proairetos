import { toLocalDate } from '../../core/scheduling/dates';
import { dailyCopiesOn, keepToday } from '../../data/backup/daily';
import { countRecords } from '../../data/backup/format';
import { backupService } from '../services';
import { packBackup } from '../../data/backup/packing';
import { writableFolder, writeToFolder } from './backupFolder';

/** Today's copy of everything, if there is something to keep and none was made today. Quietly does nothing otherwise. */
export async function makeDailyCopy(): Promise<void> {
  if (!dailyCopiesOn()) return;
  const today = toLocalDate(new Date());
  let made: string | undefined;
  await keepToday(today, async () => {
    const data = await backupService.exportData();
    const counts = countRecords(data);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (total === 0) return undefined;
    made = await backupService.exportFile();
    return made;
  }).catch(() => undefined);
  // The same copy into the chosen backup folder, when there is one and writing is still allowed.
  if (made) await dailyCopyToFolder(made, today).catch(() => undefined);
}

const DAILY_SUB = 'Daily copies';
const FOLDER_KEEP_DAYS = 14;

/** Writes a day's copy into the backup folder's "Daily copies", letting go of those older than two weeks. */
export async function dailyCopyToFolder(text: string, day: string): Promise<boolean> {
  const folder = await writableFolder();
  if (!folder) return false;
  const { blob, extension } = await packBackup(text);
  await writeToFolder(folder, `proairetos-${day}.${extension}`, blob, { sub: DAILY_SUB });
  const sub = await folder.getDirectoryHandle(DAILY_SUB);
  const names: string[] = [];
  for await (const name of (sub as unknown as { keys: () => AsyncIterable<string> }).keys()) names.push(name);
  const copies = names.filter((name) => /^proairetos-\d{4}-\d{2}-\d{2}\./.test(name)).sort();
  for (const name of copies.slice(0, Math.max(0, copies.length - FOLDER_KEEP_DAYS))) await sub.removeEntry(name).catch(() => undefined);
  return true;
}

/** Called once when an app opens: a copy now (a little after start), and again when it is opened on a new day. */
/**
 * Asks the browser to keep this site's storage when the device runs short of space, so records, keys and daily
 * copies are not cleared without asking. Asked only from an installed app, where browsers grant it without a prompt
 * (Firefox would ask in a tab, and nothing here asks twice).
 */
export async function keepStorage(asked = false): Promise<boolean> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage?.persist || !storage.persisted) return false;
  if (await storage.persisted()) return true;
  // Asked by the person (a tap): ask the browser whatever the display.
  if (asked) return storage.persist().catch(() => false);
  const installed = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!installed) return false;
  return storage.persist().catch(() => false);
}

let lastTouched = 0;

/** Reading every store for the copy takes a moment on a full year; it waits until the page is still and the browser idle. */
function whenStill(run: () => void): void {
  if (performance.now() - lastTouched < 1500) {
    window.setTimeout(() => whenStill(run), 1500);
    return;
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5000 });
  else run();
}

export function startDailyCopies(): void {
  const touched = () => (lastTouched = performance.now());
  for (const kind of ['scroll', 'pointerdown', 'keydown'])
    addEventListener(kind, touched, { passive: true, capture: true });
  window.setTimeout(() => void keepStorage(), 2000);
  window.setTimeout(() => whenStill(() => void makeDailyCopy()), 4000);
  // The same copy, sealed, into the person's own storage once the account is open here (after a sync).
  window.setTimeout(() => void import('./cloudBackups').then((own) => own.watchOwnStorageCopies()).catch(() => undefined), 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') window.setTimeout(() => whenStill(() => void makeDailyCopy()), 2000);
  });
}
