import { toLocalDate } from '../../core/scheduling/dates';
import { dailyCopiesOn, keepToday } from '../../data/backup/daily';
import { countRecords } from '../../data/backup/format';
import { backupService } from '../services';

/** Today's copy of everything, if there is something to keep and none was made today. Quietly does nothing otherwise. */
export async function makeDailyCopy(): Promise<void> {
  if (!dailyCopiesOn()) return;
  await keepToday(toLocalDate(new Date()), async () => {
    const data = await backupService.exportData();
    const counts = countRecords(data);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (total === 0) return undefined;
    return backupService.exportFile();
  }).catch(() => undefined);
}

/** Called once when an app opens: a copy now (a little after start), and again when it is opened on a new day. */
/**
 * Asks the browser to keep this site's storage when the device runs short of space, so records, keys and daily
 * copies are not cleared without asking. Asked only from an installed app, where browsers grant it without a prompt
 * (Firefox would ask in a tab, and nothing here asks twice).
 */
export async function keepStorage(): Promise<boolean> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage?.persist || !storage.persisted) return false;
  if (await storage.persisted()) return true;
  const installed = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!installed) return false;
  return storage.persist().catch(() => false);
}

export function startDailyCopies(): void {
  window.setTimeout(() => void keepStorage(), 2000);
  window.setTimeout(() => void makeDailyCopy(), 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void makeDailyCopy();
  });
}
