export const now = new Date(2026, 9, 1, 12, 0);
export const until = new Date(now.getTime() + 14 * 86_400_000);
// The records the notice tests share: one of each kind an app's notices read, with a marked value in every field a notice must not carry.
const at = (day: number, time = '09:00') => `2026-10-${String(day).padStart(2, '0')}T${time}`;
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const stamp = '2026-09-01T00:00:00.000Z';

export function seed(names: boolean) {
  localStorage.clear();
  for (const app of ['philia', 'ergon', 'ktema', 'melete', 'phyton', 'poreia', 'diaita']) put(`${app}:settings`, { started: true });
  put('therapeia:settings', { started: true, notices: { doses: true, names, refills: true, appointments: true, appointmentLead: 120 } });

  put('philia:person:p1', { id: 'p1', name: 'Mia', birthday: '1990-10-04', dates: [{ id: 'd1', label: 'Anniversary', date: '10-09' }], notes: [{ id: 'n', text: 'CANARY-remember', at: stamp }], gifts: [], times: [], touchEvery: 20, lastInTouch: '2026-09-01', phone: '555-CANARY', email: 'canary@example.com' });
  put('ergon:chore:c1', { id: 'c1', name: 'Take out bins', room: 'CANARY-room', repeat: { kind: 'days', every: 2 }, history: [{ date: '2026-09-29' }], start: '2026-09-01', note: 'CANARY-note' });
  put('ktema:thing:t1', { id: 't1', name: 'Dishwasher', category: 'Appliance', serial: 'CANARY-serial', price: '$649', warrantyUntil: '2026-10-20', note: 'CANARY-note', createdAt: stamp });
  put('ktema:upkeep:u1', { id: 'u1', name: 'Clean the filter', thingId: 't1', every: { count: 1, unit: 'months' }, start: '2026-10-05', history: [], note: 'CANARY-note', createdAt: stamp });
  put('melete:subject:s1', { id: 's1', name: 'Biology', dates: [{ id: 'sd1', title: 'Final', date: '2026-10-08', kind: 'exam', hours: 9 }], materials: [{ id: 'm1', title: 'CANARY-material', url: 'https://example.com/canary' }], ifThen: 'CANARY-ifthen', createdAt: stamp });
  put('melete:session:x1', { id: 'x1', subjectId: 's1', kind: 'read', start: at(3, '16:00'), minutes: 45 });
  put('phyton:plant:pl1', { id: 'pl1', name: 'Kitchen pothos', every: 7, start: '2026-10-05', log: [], place: 'Kitchen', createdAt: stamp });
  put('therapeia:medicine:m1', { id: 'm1', name: 'Amoxicillin', dose: '500 mg', note: 'CANARY-note', times: [{ kind: 'clock', at: '08:00' }], days: { kind: 'daily' }, start: '2026-09-25', taken: [], supply: { count: 8, countedAt: '2026-10-01T08:00:00.000Z', perDose: 1, lead: 3 }, createdAt: stamp });
  put('therapeia:visit:v1', { id: 'v1', with: 'Dr Patel', at: at(6, '14:30'), where: 'Clinic CANARY-where', questions: [{ id: 'q', text: 'CANARY-question' }], note: 'CANARY-note' });
  put('poreia:trip:r1', { id: 'r1', name: 'Lisbon', place: { name: 'Lisbon', label: 'Lisbon, Portugal' }, start: '2026-10-02', end: '2026-10-09', travelers: 1, stage: 'booked' });
  put('poreia:booking:b1', { id: 'b1', tripId: 'r1', kind: 'flight', title: 'TP 237', provider: 'TAP', confirmation: 'CANARYCODE', startDate: '2026-10-02', startTime: '07:40', from: 'CANARY-JFK', to: 'LIS', address: 'CANARY-address', notes: 'CANARY-note', createdAt: stamp, updatedAt: stamp });
  put('poreia:booking:b2', { id: 'b2', tripId: 'r1', kind: 'stay', title: 'Hotel Avenida', confirmation: 'CANARYSTAY', startDate: '2026-10-02', endDate: '2026-10-09', address: 'CANARY-street 1', createdAt: stamp, updatedAt: stamp });
  put('poreia:plan:pn1', { id: 'pn1', tripId: 'r1', date: '2026-10-03', time: '12:30', title: 'Lunch', where: 'Alfama', note: 'CANARY-note', createdAt: stamp });
  put('poreia:pack:k1', { id: 'k1', tripId: 'r1', text: 'Charger', done: false });
}

