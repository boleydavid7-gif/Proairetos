import type { Decision } from '../../core/decisions/types';
import type { CompassStatement } from '../../core/compass/types';
import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItem } from '../../core/life-items/types';
import type { Reflection } from '../../core/reflections/types';
import type { ScheduleException, SchedulePattern } from '../../core/scheduling/types';
import type { ChosenValue } from '../../core/values/types';

export const BACKUP_FORMAT = 'proairetos-backup';
export const BACKUP_VERSION = 1;

export interface BackupData {
  lifeItems: LifeItem[];
  itemEvents: ItemEvent[];
  reflections: Reflection[];
  values: ChosenValue[];
  statements: CompassStatement[];
  schedulePatterns: SchedulePattern[];
  scheduleExceptions: ScheduleException[];
  decisions: Decision[];
}

export interface PlainBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  encrypted: false;
  data: BackupData;
}

/** The same contents, sealed with a password (PBKDF2 -> AES-GCM). */
export interface EncryptedBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  encrypted: true;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  ciphertext: string;
}

export type BackupFile = PlainBackup | EncryptedBackup;

export const backupKeys: (keyof BackupData)[] = [
  'lifeItems',
  'itemEvents',
  'reflections',
  'values',
  'statements',
  'schedulePatterns',
  'scheduleExceptions',
  'decisions',
];

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Checks shape before anything on the device is touched. */
export function validateData(value: unknown): BackupData {
  if (!isRecord(value)) throw new BackupError('This file does not contain Proairetos data.');
  for (const key of backupKeys) {
    const list = value[key];
    if (!Array.isArray(list)) throw new BackupError(`This file is missing ${key}.`);
    for (const record of list) {
      if (!isRecord(record) || typeof record.id !== 'string') {
        throw new BackupError(`Some ${key} in this file are damaged.`);
      }
    }
  }
  return value as unknown as BackupData;
}

export function parseBackupFile(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('This file could not be read. Is it a Proairetos backup?');
  }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new BackupError('This is not a Proairetos backup file.');
  }
  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of Proairetos. Update the app, then try again.');
  }
  if (parsed.encrypted === true) return parsed as unknown as EncryptedBackup;
  return { ...(parsed as unknown as PlainBackup), data: validateData(parsed.data) };
}

export function countRecords(data: BackupData): Record<keyof BackupData, number> {
  return Object.fromEntries(backupKeys.map((key) => [key, data[key].length])) as Record<keyof BackupData, number>;
}
