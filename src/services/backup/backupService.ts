import type { DomainContext } from '../../core/context';
import { decryptBackup, encryptBackup } from '../../data/backup/crypto';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  parseBackupFile,
  type BackupData,
  type BackupFile,
} from '../../data/backup/format';
import type { Repositories } from '../../data/storage/deviceStorage';

export type BackupServiceDeps = {
  userId: string;
  context: DomainContext;
  repositories: Repositories;
};

/** Everything on the device, out to a file and back. The person's data, in their hands. */
export function createBackupService({ userId, context, repositories: r }: BackupServiceDeps) {
  async function exportData(): Promise<BackupData> {
    const lifeItems = await r.items.list(userId);
    const [itemEvents, reflections, values, statements, schedulePatterns, scheduleExceptions, decisions] = await Promise.all([
      r.events.listForItems(lifeItems.map((item) => item.id)),
      r.reflections.list(userId),
      r.values.list(userId),
      r.statements.list(userId),
      r.schedulePatterns.list(userId),
      r.scheduleExceptions.list(userId),
      r.decisions.list(userId),
    ]);
    return { lifeItems, itemEvents, reflections, values, statements, schedulePatterns, scheduleExceptions, decisions };
  }

  async function deleteAll(): Promise<void> {
    const current = await exportData();
    await r.events.remove(current.itemEvents.map((event) => event.id));
    await Promise.all([
      ...current.lifeItems.map((item) => r.items.remove(item.id)),
      ...current.reflections.map((reflection) => r.reflections.remove(reflection.id)),
      ...current.values.map((value) => r.values.remove(value.id)),
      ...current.statements.map((statement) => r.statements.remove(statement.id)),
      ...current.schedulePatterns.map((pattern) => r.schedulePatterns.remove(pattern.id)),
      ...current.scheduleExceptions.map((exception) => r.scheduleExceptions.remove(exception.id)),
      ...current.decisions.map((decision) => r.decisions.remove(decision.id)),
    ]);
  }

  return {
    exportData,

    /** A file's text, sealed with the password if one is given. */
    async exportFile(password?: string): Promise<string> {
      const data = await exportData();
      const exportedAt = context.now().toISOString();
      const file: BackupFile = password
        ? await encryptBackup(data, password, exportedAt)
        : { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, encrypted: false, data };
      return JSON.stringify(file);
    },

    /** Reads and checks a file without changing anything on the device. */
    async readFile(text: string, password?: string): Promise<{ data: BackupData; exportedAt: string }> {
      const file = parseBackupFile(text);
      if (file.encrypted) {
        if (!password) throw new BackupError('This backup is locked. Enter its password.');
        return { data: await decryptBackup(file, password), exportedAt: file.exportedAt };
      }
      return { data: file.data, exportedAt: file.exportedAt };
    },

    deleteAll,

    /** Replaces everything on the device with a checked backup. Records are claimed for this person. */
    async replaceAll(data: BackupData): Promise<void> {
      const mine = <T extends { userId?: string }>(records: T[]) => records.map((record) => ({ ...record, userId }));
      await deleteAll();
      for (const item of mine(data.lifeItems)) await r.items.create(item);
      await r.events.append(data.itemEvents);
      for (const reflection of mine(data.reflections)) await r.reflections.create(reflection);
      for (const value of mine(data.values)) await r.values.add(value);
      for (const statement of mine(data.statements)) await r.statements.add(statement);
      for (const pattern of mine(data.schedulePatterns)) await r.schedulePatterns.add(pattern);
      for (const exception of mine(data.scheduleExceptions)) await r.scheduleExceptions.put(exception);
      for (const decision of mine(data.decisions)) await r.decisions.add(decision);
    },
  };
}

export type BackupService = ReturnType<typeof createBackupService>;
