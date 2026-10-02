/** How much there is to lose before a backup is worth offering. */
export const BACKUP_AFTER_ITEMS = 10;
export const BACKUP_EVERY_DAYS = 30;

/**
 * Whether saving a backup is worth offering: only without sync (sync keeps
 * its own copy), once there is something to lose, and not more than monthly.
 */
export function backupWorthOffering(opts: { syncing: boolean; recordCount: number; lastBackup: string | null; now: Date }): boolean {
  if (opts.syncing || opts.recordCount < BACKUP_AFTER_ITEMS) return false;
  if (!opts.lastBackup) return true;
  return opts.now.getTime() - new Date(opts.lastBackup).getTime() >= BACKUP_EVERY_DAYS * 86_400_000;
}
