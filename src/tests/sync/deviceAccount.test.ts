// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The device's records, as the backup service sees them: one list, so putting away and bringing back can be watched.
const device = vi.hoisted(() => ({ items: [] as string[] }));
vi.mock('../../app/services', () => ({
  deviceDatabase: Promise.resolve(null),
  backupService: {
    exportFile: async () => JSON.stringify(device.items),
    readFile: async (text: string) => ({ data: JSON.parse(text), exportedAt: '' }),
    replaceAll: async (data: string[]) => {
      device.items = [...data];
    },
  },
}));

const { changeDeviceAccount, deviceAccount } = await import('../../app/sync/deviceAccount');

describe('one device, more than one account', () => {
  beforeEach(() => localStorage.clear());

  it('gives what was here before any account to the first one that signs in', async () => {
    localStorage.setItem('proairetos.displayName', 'Sam');
    expect(await changeDeviceAccount('a', null)).toBe(false);
    expect(deviceAccount()).toBe('a');
    expect(localStorage.getItem('proairetos.displayName')).toBe('Sam');
  });

  it('starts a new account clean and brings the last one back when it signs in again', async () => {
    device.items = ['A’s to-do'];
    localStorage.setItem('proairetosAccount', 'a');
    localStorage.setItem('proairetos.displayName', 'Sam');
    localStorage.setItem('proairetos.auth', 'session');
    localStorage.setItem('somaShared.items.x', 'list');

    expect(await changeDeviceAccount('b', 'a')).toBe(true);
    expect(deviceAccount()).toBe('b');
    expect(localStorage.getItem('proairetos.displayName')).toBeNull();
    expect(localStorage.getItem('somaShared.items.x')).toBeNull();
    expect(localStorage.getItem('proairetos.auth')).toBe('session');

    device.items = ['B’s to-do'];
    localStorage.setItem('proairetos.displayName', 'Alex');
    expect(await changeDeviceAccount('a', 'b')).toBe(true);
    expect(device.items).toEqual(['A’s to-do']);
    expect(localStorage.getItem('proairetos.displayName')).toBe('Sam');
    expect(localStorage.getItem('somaShared.items.x')).toBe('list');

    // And B's things were put away in turn.
    expect(await changeDeviceAccount('b', 'a')).toBe(true);
    expect(device.items).toEqual(['B’s to-do']);
    expect(localStorage.getItem('proairetos.displayName')).toBe('Alex');
  });

  it('only reloads a page still showing the last account when another tab already changed it', async () => {
    localStorage.setItem('proairetosAccount', 'b');
    expect(await changeDeviceAccount('b', 'a')).toBe(true);
    expect(await changeDeviceAccount('b', 'b')).toBe(false);
  });
});
