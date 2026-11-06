import { buildLifeRecords, type LifeRecord, type LifeRecordInput } from '../../core/life-records';

/*
 * The records the Library tests share (Slice 6): companion records in the stores the page reads, Proairetos's own records and the study
 * sessions as plain values, a marked value in every field an entry must not carry, and the three states of the Store the baseline records.
 */
export const TODAY = '2026-11-05';
export const stamp = '2026-09-01T10:00:00.000Z';
export const COMPANIONS = ['askesis', 'dynamis', 'soma', 'theoria', 'mneme', 'poreia', 'oikonomia'] as const;

export const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

export async function seedCompanions() {
  localStorage.clear();
  put('askesis:settings', { unit: 'mi' });
  put('dynamis:setup', { aim: 'strength', place: 'gym', isNew: false, days: [1, 3, 5], sets: 3, setsSince: '2026-09-01', unit: 'lb', startedOn: '2026-09-01', steps: {}, at: '17:30' });
  put('dynamis:workout:w1', { id: 'w1', date: '2026-10-12', session: 'A', createdAt: '2026-10-12T18:30:00.000Z', minutes: 48, felt: 'good', note: 'Right knee felt fine.', exercises: [{ exercise: 'squat', name: 'Back squat', sets: [{ reps: 5, weight: 135 }, { reps: 5, weight: 145 }] }, { exercise: 'row', name: 'Row', sets: [{ reps: 8 }] }, { exercise: 'press', name: 'Press', sets: [] }] });
  put('mneme:note:n1', { id: 'n1', title: 'Chosen note', body: 'A note chosen for Reflect.\nSecond line.', pinned: false, inReflect: true, archived: false, source: 'voice', kind: 'note', transcript: { segments: [{ start: 0, end: 1, text: 'spoken words' }], at: stamp }, createdAt: '2026-10-20T08:00:00.000Z', updatedAt: stamp });
  put('mneme:note:n2', { id: 'n2', title: 'Old pinned note', body: 'Pinned before choosing existed.', pinned: true, archived: true, createdAt: '2026-08-02T08:00:00.000Z', updatedAt: stamp });
  put('mneme:note:n3', { id: 'n3', title: 'Not chosen', body: 'CANARY-unselected-note', pinned: false, inReflect: false, archived: false, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: stamp });
  put('mneme:note:n4', { id: 'n4', title: '', body: 'CANARY-pinned-but-declined', pinned: true, inReflect: false, archived: false, createdAt: '2026-10-22T08:00:00.000Z', updatedAt: stamp });
  put('mneme:idea:i1', { id: 'i1', text: 'An idea chosen for Reflect\nwith more words', stage: 'shape', inReflect: true, createdAt: '2026-10-25T08:00:00.000Z', updatedAt: stamp });
  put('mneme:idea:i2', { id: 'i2', text: 'CANARY-unselected-idea', stage: 'spark', createdAt: '2026-10-26T08:00:00.000Z', updatedAt: stamp });
  put('poreia:trip:r1', { id: 'r1', name: 'Lisbon', place: { name: 'Lisbon', label: 'Lisbon, Portugal', country: 'Portugal', countryCode: 'PT' }, start: '2026-09-10', end: '2026-09-16', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
  put('poreia:trip:r2', { id: 'r2', name: 'Porto (upcoming)', place: { name: 'Porto', label: 'Porto, Portugal', country: 'Portugal', countryCode: 'PT' }, start: '2026-12-10', end: '2026-12-12', travelers: 1, stage: 'booked', createdAt: stamp, updatedAt: stamp });
  put('poreia:journal:j1', { id: 'j1', tripId: 'r1', date: '2026-09-12', kind: 'memory', title: 'Tram 28', text: 'Rode the tram up the hill.', place: 'Alfama', createdAt: stamp, updatedAt: stamp });
  put('poreia:journal:j2', { id: 'j2', tripId: 'r2', date: '2026-12-10', kind: 'day', text: 'CANARY-upcoming-journal', createdAt: stamp, updatedAt: stamp });
  put('poreia:booking:b1', { id: 'b1', tripId: 'r1', kind: 'flight', title: 'TP 237', confirmation: 'CANARYCODE', address: 'CANARY-street', startDate: '2026-09-10', createdAt: stamp, updatedAt: stamp });
  put('oikonomia:reflect-milestone:m1', { id: 'm1', title: 'Paid off the card', body: 'Wrote this down for myself.', date: '2026-10-30', inReflect: true, createdAt: stamp, updatedAt: stamp });
  put('oikonomia:reflect-milestone:m2', { id: 'm2', title: 'CANARY-unselected-milestone', date: '2026-10-31', inReflect: false, createdAt: stamp, updatedAt: stamp });
  const { deviceDatabase } = await import('../../app/services');
  const db = (await deviceDatabase)!;
  const write = (store: string, record: unknown) =>
    new Promise<void>((resolveWrite, reject) => {
      const request = db.transaction(store, 'readwrite').objectStore(store).put(record);
      request.onsuccess = () => resolveWrite();
      request.onerror = () => reject(request.error);
    });
  await write('askesisWorkouts', { id: 'a1', date: '2026-10-14', activity: 'run', meters: 5230, seconds: 1750, avgHr: 151, felt: 'easy', notes: 'River loop.', wentWell: 'Steady pace', nextTime: 'Start slower', intention: 'Relax the shoulders', shoeId: 'CANARY-shoe', workoutTitle: 'Easy run', createdAt: '2026-10-14T07:10:00.000Z' });
  await write('askesisWorkouts', { id: 'a2', date: '2026-10-18', activity: 'walk', seconds: 2400, createdAt: '2026-10-18T09:00:00.000Z' });
  await write('somaRecipes', { id: 'rc1', title: 'Lentil soup', notes: 'Less salt next time.', tags: ['soup'], ingredients: ['lentils', 'carrot'], source: 'Grandma', cookedFor: { '2026-10-10': ['Mia', 'Tomas', 'Ana'], '2026-10-24': ['Mia'], '2026-10-25': [] }, createdAt: stamp, updatedAt: stamp });
}

// What the page gives Proairetos's own records and the study sessions: plain values, since these sources do not move in Slice 6.
export const NATIVE = {
  reflections: [
    { id: 'rf1', kind: 'FREE', body: 'A reflection from the journal.\nMore words.', valueIds: ['v1'], createdAt: '2026-10-28T20:00:00.000Z' },
    { id: 'rf2', kind: 'FREE', promptKey: 'after-run', body: 'A line after the run.', createdAt: '2026-10-14T08:00:00.000Z' },
    { id: 'rf3', kind: 'INTENTION', body: 'An archived intention.', createdAt: '2026-10-01T08:00:00.000Z', archivedAt: '2026-10-02T08:00:00.000Z' },
  ],
  decisions: [{ id: 'd1', question: 'Take the new role?', options: ['Yes', 'No'], choice: 'Yes', reasons: 'More room to learn.', expected: 'A harder year', valueNotes: { v1: 'Learning' }, decidedAt: '2026-10-05T12:00:00.000Z' }],
  pursuits: [{ id: 'p1', title: 'Run a 10K', status: 'active', area: 'Health', outcome: 'Finish', why: 'Energy', current: 'Week 3', nextMove: 'Long run Sunday', valueNotes: { v1: 'x' }, createdAt: '2026-09-15T08:00:00.000Z', updatedAt: stamp }],
  items: [{ id: 'it1', type: 'DO', status: 'OPEN', title: 'Call the bank', notes: 'Ask about the form.', nextStep: 'Find the number', valueIds: ['v1'], createdAt: '2026-10-29T08:00:00.000Z' }],
  study: [
    { id: 's1', itemId: 'b1', title: 'Biology', minutes: 40, at: '2026-10-27T15:00:00.000Z', kind: 'study' as const },
    { id: 's2', itemId: 'b2', title: 'Read: Meditations', minutes: 20, at: '2026-10-27T21:00:00.000Z', kind: 'reading' as const },
    { id: 's3', itemId: 'b2', title: 'Read: Meditations', minutes: 15, at: '2026-10-27T22:00:00.000Z', kind: 'reading' as const },
  ],
};

/** `study`: the raw study sessions (the baseline gives plain values; a test that takes them from the timer's blocks and events gives those). */
export async function gatherInput(study: readonly (typeof NATIVE.study)[number][] = NATIVE.study): Promise<LifeRecordInput> {
  const { readRuns } = await import('../../app/askesis/runs');
  const { readRecipes } = await import('../../app/soma/meals');
  const { combineReadingSessions } = await import('../../app/praxis/study');
  const { plan, workouts } = await import('../../dynamis/app/state');
  const { notes, ideas } = await import('../../mneme/app/state');
  const { trips, journal } = await import('../../poreia/app/state');
  const { reflectMilestones } = await import('../../oikonomia/data/reflect');
  const runs = await readRuns();
  return {
    reflections: NATIVE.reflections as never,
    decisions: NATIVE.decisions as never,
    pursuits: NATIVE.pursuits as never,
    items: NATIVE.items as never,
    workouts: runs.workouts,
    distanceUnit: runs.unit,
    strengthWorkouts: workouts.list(),
    strengthUnit: plan.load().unit ?? 'kg',
    recipes: await readRecipes(),
    studySessions: combineReadingSessions(study),
    mnemeNotes: notes.list(),
    mnemeIdeas: ideas.list(),
    poreiaTrips: trips.list(),
    poreiaJournal: journal.list(),
    poreiaToday: TODAY,
    oikonomiaMilestones: reflectMilestones.list(),
  };
}

export async function gather(skip: ReadonlySet<string> = new Set(), study: readonly (typeof NATIVE.study)[number][] = NATIVE.study): Promise<LifeRecord[]> {
  return buildLifeRecords(await gatherInput(study), skip);
}

export const STATES = {
  'every app added (the owner)': () => { put('proairetos.apps', { added: COMPANIONS }); put('proairetosOwned', { apps: ['core'], owner: true, account: true }); },
  'every app removed (the owner)': () => { put('proairetos.apps', { added: [] }); put('proairetosOwned', { apps: ['core'], owner: true, account: true }); },
  'apps added, not bought and no trial left': () => { put('proairetos.apps', { added: COMPANIONS }); localStorage.removeItem('proairetosOwned'); },
} as const;

