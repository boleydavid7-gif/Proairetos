import { openDatabase } from '../../data/storage/indexeddb/database';

/*
 * Poreia started over (October 2026). The first version kept its records in ten database tables. When Poreia opens
 * and finds any, it says so once (with Save a copy), then clears them; sync carries the removal to the account and
 * the other devices. Its old settings in browser storage go too. Nothing in the new Poreia reads or writes those tables.
 */

const OLD_TABLES = ['poreiaTrips', 'poreiaPlaces', 'poreiaWorkProfiles', 'poreiaPtoAccounts', 'poreiaPtoLedger', 'poreiaLeaveRequests', 'poreiaVacations', 'poreiaItineraryItems', 'poreiaBookings', 'poreiaSavingsPlans'];
const OLD_KEYS = ['poreia:started', 'poreia:openTripForm', 'poreia.discover.open', 'poreia.discover.recentPlaces', 'poreia.discover.recentSearches'];

/** How many records the first version left on this device. */
export async function countFirstVersion(): Promise<number> {
  try {
    const db = await openDatabase();
    const tables = OLD_TABLES.filter((name) => db.objectStoreNames.contains(name));
    if (!tables.length) return 0;
    return await new Promise<number>((resolve) => {
      let total = 0;
      const transaction = db.transaction(tables, 'readonly');
      for (const name of tables) {
        const count = transaction.objectStore(name).count();
        count.onsuccess = () => (total += count.result);
      }
      transaction.oncomplete = () => resolve(total);
      transaction.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function clearFirstVersion(): Promise<number> {
  for (const key of OLD_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  }
  let removed = 0;
  try {
    const db = await openDatabase();
    const tables = OLD_TABLES.filter((name) => db.objectStoreNames.contains(name));
    if (!tables.length) return 0;
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(tables, 'readwrite');
      for (const name of tables) {
        const store = transaction.objectStore(name);
        const count = store.count();
        count.onsuccess = () => {
          removed += count.result;
          if (count.result) store.clear();
        };
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    // No database here: nothing to clear.
  }
  return removed;
}
