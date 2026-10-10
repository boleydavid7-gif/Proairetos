import { IDBFactory } from 'fake-indexeddb';
import { gatherFamily, keptInBackup, restoreFamily, settingsSnapshot } from '../../data/backup/family';
import { validateData } from '../../data/backup/format';
import { openDatabase, stores } from '../../data/storage/indexeddb/database';

const put = (db: IDBDatabase, store: string, record: unknown) =>
  new Promise<void>((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(record);
    tx.oncomplete = () => resolve();
  });

/** A stand-in for the browser's storage, with keys that can be listed. */
function fakeStorage() {
  const data = new Map<string, string>();
  const storage = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
}

describe('one backup for the family', () => {
  beforeEach(() => fakeStorage());

  it('keeps every app’s settings, and leaves out sign-in, caches and drafts', () => {
    expect(keptInBackup('proairetos.quietHours')).toBe(true);
    expect(keptInBackup('askesis:settings')).toBe(true);
    expect(keptInBackup('soma:settings')).toBe(true);
    expect(keptInBackup('proairetos.otherCalendars')).toBe(true);
    expect(keptInBackup('proairetos.otherCalendars.abc')).toBe(false);
    expect(keptInBackup('proairetos.auth')).toBe(false);
    expect(keptInBackup('proairetos.journalDraft')).toBe(false);
    expect(keptInBackup('sb-project-auth-token')).toBe(false);
    localStorage.setItem('proairetos.quietHours', '{"start":"22:00"}');
    localStorage.setItem('proairetos.auth', 'secret');
    localStorage.setItem('soma:settings', '{"dailyLine":false}');
    expect(settingsSnapshot()).toEqual({ 'proairetos.quietHours': '{"start":"22:00"}', 'soma:settings': '{"dailyLine":false}' });
  });

  it('carries Askesis and SOMA records and settings from one phone to another', async () => {
    const fromFactory = new IDBFactory();
    const from = await openDatabase(fromFactory);
    await put(from, stores.askesisWorkouts, { id: 'w1', date: '2026-10-05' });
    await put(from, stores.askesisPlans, { id: 'current', week: 3 });
    await put(from, stores.somaRecipes, { id: 'r1', title: 'Soup' });
    await put(from, stores.oikonomiaBudgets, { id: '2026-10', month: '2026-10', totalCents: 250000 });
    localStorage.setItem('askesis:settings', '{"unit":"mi"}');
    const family = await gatherFamily(from);
    expect(family.askesis?.workouts).toHaveLength(1);
    expect(family.soma?.recipes).toEqual([{ id: 'r1', title: 'Soup' }]);
    expect(family.oikonomia?.budgets).toEqual([{ id: '2026-10', month: '2026-10', totalCents: 250000 }]);

    localStorage.clear();
    const toFactory = new IDBFactory();
    const to = await openDatabase(toFactory);
    await put(to, stores.somaRecipes, { id: 'old', title: 'Gone after restore' });
    await restoreFamily(JSON.parse(JSON.stringify(family)), to);
    const back = await gatherFamily(to);
    expect(back.askesis?.plans).toEqual([{ id: 'current', week: 3 }]);
    expect(back.soma?.recipes).toEqual([{ id: 'r1', title: 'Soup' }]);
    expect(back.oikonomia?.budgets).toEqual([{ id: '2026-10', month: '2026-10', totalCents: 250000 }]);
    expect(localStorage.getItem('askesis:settings')).toBe('{"unit":"mi"}');
  });

  it('still reads backups made before the other apps were in them', () => {
    const empty = { lifeItems: [], itemEvents: [], reflections: [], values: [], statements: [], schedulePatterns: [], scheduleExceptions: [], decisions: [] };
    expect(() => validateData(empty)).not.toThrow();
    expect(() => validateData({ ...empty, soma: { recipes: 'nope' } })).toThrow();
  });

  it('preserves monthly budgets when an older Oikonomia backup contains only bills', async () => {
    const db = await openDatabase(new IDBFactory());
    const budget = { id: '2026-10', month: '2026-10', totalCents: 250000 };
    await put(db, stores.oikonomiaBudgets, budget);
    await put(db, stores.oikonomiaBills, { id: 'old', name: 'Old bill' });

    await restoreFamily({ oikonomia: { bills: [{ id: 'restored', name: 'Rent' }] } }, db);

    const restored = await gatherFamily(db);
    expect(restored.oikonomia?.bills).toEqual([{ id: 'restored', name: 'Rent' }]);
    expect(restored.oikonomia?.budgets).toEqual([budget]);
  });

  it('replaces monthly budgets when a newer backup explicitly contains an empty budget list', async () => {
    const db = await openDatabase(new IDBFactory());
    await put(db, stores.oikonomiaBudgets, { id: '2026-10', month: '2026-10', totalCents: 250000 });

    await restoreFamily({ oikonomia: { bills: [], budgets: [] } }, db);

    expect((await gatherFamily(db)).oikonomia?.budgets).toEqual([]);
  });
});
