import { beforeEach, describe, expect, it, vi } from 'vitest';

// A stand-in for the person's own storage folder and the account's key.
const files = new Map<string, Uint8Array<ArrayBuffer>>();
const folder = {
  list: async () => [...files.keys()].map((name) => ({ name, version: '1' })),
  read: async (name: string) => files.get(name) ?? null,
  write: async (name: string, bytes: Uint8Array<ArrayBuffer>) => void files.set(name, bytes),
  remove: async (name: string) => void files.delete(name),
};
let connected = true;
const MARK = 7;

vi.mock('../../app/sync/syncController', () => ({
  ownBackupStorage: async () => (connected ? { name: 'Google Drive', folder } : null),
  // "Sealing" here shifts every byte and records the label, so a test can tell sealed from plain.
  sealWithAccount: async (label: string, bytes: ArrayBuffer) => ({
    userId: 'u',
    sealed: new Uint8Array([...new TextEncoder().encode(`${label}|`), ...new Uint8Array(bytes).map((b) => (b + MARK) % 256)]),
  }),
  openWithAccount: async (label: string, sealed: ArrayBuffer) => {
    const all = new Uint8Array(sealed);
    const head = new TextEncoder().encode(`${label}|`);
    if (!head.every((b, i) => all[i] === b)) return null;
    return all.slice(head.length).map((b) => (b - MARK + 256) % 256).buffer;
  },
  syncStatus: { subscribe: () => () => undefined, get: () => ({}) },
}));
vi.mock('../../app/services', () => ({ backupService: {} }));

const { backupToOwnStorage, openOwnStorageBackup, ownStorageBackups } = await import('../../app/family/cloudBackups');

describe('backups in the person own storage', () => {
  beforeEach(() => {
    files.clear();
    connected = true;
  });

  it('keeps a sealed copy that opens again to the same backup text', async () => {
    const text = JSON.stringify({ format: 'proairetos-backup', note: 'hello' });
    expect(await backupToOwnStorage(text, '2026-10-22')).toBe('Google Drive');
    const stored = files.get('backup-2026-10-22.sealed')!;
    expect(new TextDecoder().decode(stored)).not.toContain('hello');
    expect(await openOwnStorageBackup('2026-10-22')).toBe(text);
  });

  it('lists copies newest first and keeps the last fourteen days', async () => {
    for (let day = 1; day <= 16; day++) await backupToOwnStorage('{}', `2026-10-${String(day).padStart(2, '0')}`);
    files.set('log-abc-00000001.json', new Uint8Array([1]));
    const listed = await ownStorageBackups();
    expect(listed?.storage).toBe('Google Drive');
    expect(listed?.days).toHaveLength(14);
    expect(listed?.days[0]).toBe('2026-10-16');
    expect(listed?.days.at(-1)).toBe('2026-10-03');
    // The sync's own files are left alone.
    expect(files.has('log-abc-00000001.json')).toBe(true);
  });

  it('does nothing while the account syncs through Proairetos', async () => {
    connected = false;
    expect(await backupToOwnStorage('{}', '2026-10-22')).toBeNull();
    expect(await ownStorageBackups()).toBeNull();
    expect(files.size).toBe(0);
  });
});
