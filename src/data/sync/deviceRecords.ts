import { keptInBackup } from '../backup/family';
import type { LocalRecord, LocalSyncStore, SyncCollection } from './types';

/**
 * Settings that belong to this device, not the person: where they are, what they typed but have not saved,
 * how loud sound is, whether this device has been through the welcome, what it has cached.
 */
const THIS_DEVICE_ONLY = new Set([
  'proairetos.displayName',
  'proairetos.onboarded',
  'proairetos.soundVolume',
  'proairetos.praxisSound',
  'proairetos.dailyCopy',
  'proairetos.ics',
]);

/** Whether a stored setting travels with the account. */
export function syncedSetting(key: string): boolean {
  if (!keptInBackup(key) || THIS_DEVICE_ONLY.has(key)) return false;
  // Weather keeps the place (device only) and what was last fetched.
  if (key.startsWith('proairetos.weather')) return false;
  // Sync's own bookkeeping never syncs.
  if (key.startsWith('proairetos.sync')) return false;
  return true;
}

type Notify = () => void;

/**
 * Adds two kinds of record that do not live in one of the database's tables:
 *  - `preferences`: the person's settings, one record per setting, read from and written to browser storage;
 *  - `attachments`: photos and files on items. Only their details travel as records; the bytes follow
 *    separately (attachmentFiles.ts), so a record from elsewhere arrives first with its bytes still to come.
 */
export function withDeviceRecords(
  base: LocalSyncStore,
  options: { storage?: Storage; onSettingsChanged?: Notify } = {},
): LocalSyncStore {
  const storage = options.storage ?? localStorage;
  return {
    async list(collection: SyncCollection) {
      if (collection === 'preferences') {
        const records: LocalRecord[] = [];
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key && syncedSetting(key)) records.push({ id: key, value: storage.getItem(key) ?? '' });
        }
        return records;
      }
      if (collection === 'attachments') {
        return (await base.list(collection)).map(({ data: _data, ...details }) => details as LocalRecord);
      }
      return base.list(collection);
    },

    async put(collection: SyncCollection, record: LocalRecord) {
      if (collection === 'preferences') {
        if (!syncedSetting(record.id) || typeof record.value !== 'string') return;
        try {
          storage.setItem(record.id, record.value);
        } catch {
          // Storage full or blocked: the setting simply stays as it was here.
        }
        options.onSettingsChanged?.();
        return;
      }
      if (collection === 'attachments') {
        const existing = (await base.list(collection)).find((item) => item.id === record.id);
        await base.put(collection, { ...record, data: existing?.data ?? new ArrayBuffer(0) });
        return;
      }
      return base.put(collection, record);
    },

    async remove(collection: SyncCollection, id: string) {
      if (collection === 'preferences') {
        if (syncedSetting(id)) {
          try {
            storage.removeItem(id);
          } catch {
            // Nothing to remove.
          }
          options.onSettingsChanged?.();
        }
        return;
      }
      return base.remove(collection, id);
    },
  };
}
