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
export function startDailyCopies(): void {
  window.setTimeout(() => void makeDailyCopy(), 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void makeDailyCopy();
  });
}
