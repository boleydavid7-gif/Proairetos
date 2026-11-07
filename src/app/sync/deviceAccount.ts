import { putCopies, takeAllCopies, type DailyCopy } from '../../data/backup/daily';
import { stores } from '../../data/storage/indexeddb/database';
import { backupService, deviceDatabase } from '../services';

/*
 * One device, more than one account: what is on this device belongs to the account that last used it here
 * (`ACCOUNT_KEY`, device only, kept through signing out). When a different account signs in, everything of the
 * last one (records, every app's settings and device caches, the daily copies, the sync state) is put away on this
 * device under that account's id and the new account starts clean; its own things come back from its sync, or from
 * what was put away for it here before. Nothing of one account reaches another's sync. Data used here before any
 * account signed in goes with the first account that does (it was the person's own).
 */
export const ACCOUNT_KEY = 'proairetosAccount';
const AWAY_DB = 'proairetos-accounts';
/** Kept through a change of account: the sign-in itself, having seen the welcome, and the marker. */
const STAYS = new Set([
  'proairetos.auth',
  'proairetos.onboarded',
  ACCOUNT_KEY,
  'proairetos.accountPasswordSetupPending.local',
  'proairetos.accountPasswordReadyForSetup.local',
  'proairetos.accountAuthPending.local',
]);

type PutAway = { account: string; savedAt: string; backup: string; storage: Record<string, string>; daily: DailyCopy[] };

export function deviceAccount(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export function markDeviceAccount(id: string): void {
  try {
    localStorage.setItem(ACCOUNT_KEY, id);
  } catch {
    // Storage blocked: nothing to keep apart either.
  }
}

function request<T>(work: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    work.onsuccess = () => resolve(work.result);
    work.onerror = () => reject(work.error);
  });
}

function openAway(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(AWAY_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('accounts', { keyPath: 'account' });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

function storageNow(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && !STAYS.has(key)) out[key] = localStorage.getItem(key) ?? '';
  }
  return out;
}

async function emptyDevice(): Promise<void> {
  for (const key of Object.keys(storageNow())) localStorage.removeItem(key);
  const db = await deviceDatabase;
  if (!db) return;
  for (const name of Object.values(stores)) {
    if (!db.objectStoreNames.contains(name)) continue;
    await request(db.transaction(name, 'readwrite').objectStore(name).clear());
  }
}

/**
 * Puts the last account's things away and makes the device ready for `next`. Returns whether anything changed (the
 * page then reloads, so every screen reads the device afresh). Runs one tab at a time.
 */
export async function changeDeviceAccount(next: string, pageAccount: string | null): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    const last = deviceAccount();
    // Another tab already changed it: this page still shows the last account's things.
    if (last === next) return pageAccount !== next;
    if (!last) {
      markDeviceAccount(next);
      return false;
    }
    const away = await openAway();
    const putAway: PutAway = { account: last, savedAt: new Date().toISOString(), backup: await backupService.exportFile(), storage: storageNow(), daily: await takeAllCopies() };
    await request(away.transaction('accounts', 'readwrite').objectStore('accounts').put(putAway));
    await emptyDevice();
    const mine = (await request(away.transaction('accounts', 'readonly').objectStore('accounts').get(next))) as PutAway | undefined;
    if (mine) {
      await backupService.replaceAll((await backupService.readFile(mine.backup)).data);
      for (const [key, value] of Object.entries(mine.storage)) localStorage.setItem(key, value);
      await putCopies(mine.daily);
      await request(away.transaction('accounts', 'readwrite').objectStore('accounts').delete(next));
    }
    markDeviceAccount(next);
    return true;
  };
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request('proairetos-account', run) : run();
}
