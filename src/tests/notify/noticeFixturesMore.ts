import { newSetup } from '../../dynamis/core/plan';

/*
 * Records for Dynamis, Askesis run days and Oikonomia bills, with a marked value in every field a notice must not carry.
 * Added on top of `seed` (noticeFixtures.ts). Askesis's plan and the bills live in the device database, so this is async.
 */
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const stamp = '2026-09-01T00:00:00.000Z';

export async function seedMore() {
  put('dynamis:settings', { started: true, reminders: true });
  put('dynamis:setup', { ...newSetup({ aim: 'strength', place: 'gym', isNew: false, days: [1, 3, 5], unit: 'lb' }, '2026-09-01'), at: '17:30' });
  put('dynamis:workout:w1', { id: 'w1', date: '2026-09-28', session: 'A', createdAt: stamp, note: 'CANARY-dynamis-note', sets: [] });

  const { deviceDatabase } = await import('../../app/services');
  const db = (await deviceDatabase)!;
  const write = (store: string, record: unknown) =>
    new Promise<void>((resolve, reject) => {
      const request = db.transaction(store, 'readwrite').objectStore(store).put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  await write('askesisPlans', {
    id: 'current',
    aim: { kind: 'distance', meters: 5000 },
    aimWords: 'CANARY-aimwords',
    why: 'CANARY-why',
    ifThen: 'CANARY-ifthen',
    days: 3,
    weekdays: [0, 2, 4],
    week: 2,
    joinWeek: 1,
    weekOf: '2026-09-28',
    moves: {},
    startedOn: '2026-09-21',
    runAt: '06:30',
    place: 'River path',
  });
  const bill = { currency: 'USD', frequency: 'monthly', payments: [], createdAt: stamp, updatedAt: stamp, category: 'CANARY-area', notes: 'CANARY-note' };
  await write('oikonomiaBills', { ...bill, id: 'b1', name: 'Rent', amountCents: 123456, dueDate: '2026-10-05', autopay: false, reminderDays: 2 });
  await write('oikonomiaBills', { ...bill, id: 'b2', name: 'Internet', amountCents: 7999, dueDate: '2026-10-06', autopay: true, reminderDays: 2 });
}
