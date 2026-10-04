import { onRemoteChanges, syncSoon } from '../../app/sync/syncController';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';
import type { Bill } from '../core/bills';

const SETTINGS = 'oikonomia:settings';

export type Settings = {
  started: boolean;
  currency: string;
  calendarNotice: boolean;
};

export function defaultSettings(): Settings {
  return { started: false, currency: 'USD', calendarNotice: true };
}

function readSettings(): Partial<Settings> {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS) ?? '{}') as Partial<Settings>;
  } catch {
    return {};
  }
}

export function loadSettings(): Settings {
  const saved = readSettings();
  return {
    ...defaultSettings(),
    ...saved,
    started: saved.started === true,
    currency: typeof saved.currency === 'string' && saved.currency.length === 3 ? saved.currency : 'USD',
    calendarNotice: saved.calendarNotice !== false,
  };
}

const listeners = new Set<() => void>();
let version = 0;
const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function storeVersion(): number {
  return version;
}

let database: Promise<IDBDatabase | undefined> | undefined;
const memory = new Map<string, Bill>();

function db(): Promise<IDBDatabase | undefined> {
  database ??= openDatabase().catch(() => undefined);
  return database;
}

export async function listBills(): Promise<Bill[]> {
  const handle = await db();
  if (!handle) return [...memory.values()];
  return new Promise<Bill[]>((resolve, reject) => {
    const transaction = handle.transaction(stores.oikonomiaBills, 'readonly');
    const request = transaction.objectStore(stores.oikonomiaBills).getAll() as IDBRequest<Bill[]>;
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getBill(id: string): Promise<Bill | undefined> {
  const handle = await db();
  if (!handle) return memory.get(id);
  return new Promise<Bill | undefined>((resolve, reject) => {
    const transaction = handle.transaction(stores.oikonomiaBills, 'readonly');
    const request = transaction.objectStore(stores.oikonomiaBills).get(id) as IDBRequest<Bill | undefined>;
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putBill(bill: Bill): Promise<void> {
  const handle = await db();
  if (!handle) {
    memory.set(bill.id, bill);
  } else {
    await new Promise<void>((resolve, reject) => {
      const transaction = handle.transaction(stores.oikonomiaBills, 'readwrite');
      transaction.objectStore(stores.oikonomiaBills).put(bill);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  notify();
  syncSoon();
}

export async function deleteBill(id: string): Promise<void> {
  const handle = await db();
  if (!handle) {
    memory.delete(id);
  } else {
    await new Promise<void>((resolve, reject) => {
      const transaction = handle.transaction(stores.oikonomiaBills, 'readwrite');
      transaction.objectStore(stores.oikonomiaBills).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  notify();
  syncSoon();
}

export function saveSettings(next: Settings): void {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(next));
  } catch {
    // The app remains usable for this visit when storage is blocked.
  }
  notify();
}

export async function startStore(): Promise<void> {
  await db();
  onRemoteChanges(notify);
}

export async function exportAll(): Promise<{ app: 'oikonomia'; version: 1; exportedAt: string; settings: Settings; bills: Bill[] }> {
  return { app: 'oikonomia', version: 1, exportedAt: new Date().toISOString(), settings: loadSettings(), bills: await listBills() };
}

export async function restore(file: unknown): Promise<number> {
  if (!file || typeof file !== 'object' || (file as { app?: unknown }).app !== 'oikonomia') {
    throw new Error('That file is not an Oikonomia backup.');
  }
  const bills = (file as { bills?: unknown }).bills;
  if (!Array.isArray(bills)) throw new Error('That Oikonomia backup has no bills.');
  let count = 0;
  for (const value of bills) {
    if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') continue;
    await putBill(value as Bill);
    count += 1;
  }
  const settings = (file as { settings?: unknown }).settings;
  if (settings && typeof settings === 'object') saveSettings({ ...defaultSettings(), ...(settings as Partial<Settings>), started: true });
  return count;
}
