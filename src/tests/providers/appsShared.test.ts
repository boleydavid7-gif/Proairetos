// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { searchProjections, type HostContext, type Provider } from '../../core/providers';

/*
 * Apps whose provider reads the same list the app itself shows, which is the household's while the person is in one
 * (Ergon's chores, Therapeia's medicines). Records are placed in browser storage as the app keeps them.
 */
const TODAY = '2026-11-05';
const ctx: HostContext = {
  today: TODAY,
  now: new Date(`${TODAY}T12:00:00`),
  // Reads what the device holds: records kept one per storage key.
  records: async <T,>(source: string) => {
    const prefix = source.replace(/^local:/, '');
    const out: T[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) out.push(JSON.parse(localStorage.getItem(key) ?? 'null') as T);
    }
    return out;
  },
  setting: () => null,
  isUsable: () => true,
  enabled: () => true,
};
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const run = async (provider: Provider<'search'>) => {
  const out = await searchProjections([provider], APPS, ctx);
  expect(out.rejected).toEqual([]);
  return out.results;
};
const day = '2026-11-01T09:00:00.000Z';
beforeEach(() => localStorage.clear());

describe('Ergon', () => {
  it('holds a chore’s name and room, never its note, who it is given to, or its steps', async () => {
    const { ergonSearch } = await import('../../ergon/providers/search');
    put('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'CANARY-NOTE', who: 'CANARY-WHO', steps: [{ id: 's', text: 'CANARY-STEP' }], history: [], createdAt: day });
    const rows = await run(ergonSearch);
    expect(rows).toHaveLength(1);
    expect(rows[0].ref).toEqual({ app: 'ergon', kind: 'chore', id: 'c1' });
    expect(rows[0].open).toBe('/ergon/?open=chore%3Ac1');
    expect(JSON.stringify(rows)).toContain('Kitchen');
    expect(JSON.stringify(rows)).not.toContain('CANARY');
  });
  it('finds nothing in a chore’s note', async () => {
    const { ergonSearch } = await import('../../ergon/providers/search');
    const { search } = await import('../../core/search/search');
    put('ergon:chore:c1', { id: 'c1', name: 'Wipe counters', room: 'Kitchen', note: 'zebrafish', history: [], createdAt: day });
    const rows = await run(ergonSearch);
    const things = rows.map((row) => ({ id: row.ref.id, kind: 'app' as const, title: row.title, fields: row.fields, at: row.at }));
    expect(search('zebrafish', things)).toEqual([]);
    expect(search('kitchen', things)).toHaveLength(1);
  });
});

describe('Therapeia', () => {
  const seed = () => {
    put('therapeia:medicine:m1', { id: 'm1', name: 'Sertraline', dose: 'CANARY-DOSE 50 mg', note: 'CANARY-MEDNOTE', createdAt: day });
    put('therapeia:medicine:m2', { id: 'm2', name: 'Amoxicillin', who: 'Mia', dose: 'CANARY-DOSE2', createdAt: day });
    put('therapeia:visit:v1', { id: 'v1', with: 'Dr Lee', where: 'Clinic', notes: 'CANARY-VISITNOTE', questions: [{ id: 'q', text: 'CANARY-QUESTION' }], at: '2026-11-10T09:00', createdAt: day });
  };
  it('holds a medicine’s name, a visit’s contact and place, never doses, notes or questions', async () => {
    const { therapeiaSearch } = await import('../../therapeia/providers/search');
    seed();
    const rows = await run(therapeiaSearch);
    expect(rows.map((row) => row.title).sort()).toEqual(['Dr Lee', 'Mia: Amoxicillin', 'Sertraline']);
    expect(rows.find((row) => row.ref.kind === 'visit')?.fields.map((field) => field.text)).toEqual(['Clinic']);
    expect(JSON.stringify(rows)).not.toMatch(/CANARY|50 mg/);
  });
  it('finds nothing in a dose, a note or a question', async () => {
    const { therapeiaSearch } = await import('../../therapeia/providers/search');
    const { search } = await import('../../core/search/search');
    seed();
    const things = (await run(therapeiaSearch)).map((row) => ({ id: row.ref.id, kind: 'app' as const, title: row.title, fields: row.fields, at: row.at }));
    for (const word of ['canary-dose', 'canary-mednote', 'canary-visitnote', 'canary-question']) expect(search(word, things), word).toEqual([]);
    expect(search('clinic', things)).toHaveLength(1);
  });
});
