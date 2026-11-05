import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { searchProjections, type HostContext, type Provider } from '../../core/providers';

/*
 * What each app lets universal search hold. A canary value sits in every excluded field of a record; none may appear in
 * any row, and each allowed field must. Records are handed over through the same `records` call the device uses.
 */
const TODAY = '2026-11-05';
const ctxFor = (records: Record<string, unknown[]>): HostContext => ({
  today: TODAY,
  now: new Date(`${TODAY}T12:00:00`),
  records: async <T,>(source: string) => (records[source] ?? []) as T[],
  setting: () => null,
  isUsable: () => true,
  enabled: () => true,
});
const run = async (provider: Provider<'search'>, records: Record<string, unknown[]>) => {
  const out = await searchProjections([provider], APPS, ctxFor(records));
  expect(out.rejected).toEqual([]);
  return out.results;
};
const text = (rows: unknown) => JSON.stringify(rows);
const day = '2026-11-01T09:00:00.000Z';

describe('Soma', () => {
  it('holds a recipe’s title, ingredients, notes and tags', async () => {
    const { somaSearch } = await import('../../soma/providers/search');
    const rows = await run(somaSearch, { somaRecipes: [{ id: 'r1', title: 'Lentil soup', ingredients: ['1 cup lentils', 'carrot'], notes: 'Add lemon', tags: ['soup'], createdAt: day, nutritionCanary: 'CANARY-NUTRITION' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].ref).toEqual({ app: 'soma', kind: 'recipe', id: 'r1' });
    expect(rows[0].open).toBe('/soma/');
    expect(text(rows)).toMatch(/lentils.*Add lemon.*soup/s);
    expect(text(rows)).not.toContain('CANARY');
  });
});

describe('Theoria', () => {
  it('holds a book’s title, author, highlights and notes, never its text', async () => {
    const { theoriaSearch } = await import('../../theoria/providers/search');
    const rows = await run(theoriaSearch, { theoriaBooks: [{ id: 'bk1', title: 'Meditations', author: 'Marcus Aurelius', highlights: [{ id: 'h', text: 'Power over your mind' }], notes: [{ id: 'n', body: 'Re-read book two' }], contentPreview: 'CANARY-TEXT', updatedAt: day }] });
    expect(rows[0].ref).toEqual({ app: 'theoria', kind: 'book', id: 'bk1' });
    expect(text(rows)).toMatch(/Marcus Aurelius.*Power over your mind.*Re-read book two/s);
    expect(text(rows)).not.toContain('CANARY');
  });
});

describe('Philia', () => {
  it('holds a person’s name, who they are, remember lines, gift ideas and times together, never phone, email or dates', async () => {
    const { philiaSearch } = await import('../../philia/providers/search');
    const rows = await run(philiaSearch, { 'local:philia:person:': [{ id: 'p1', name: 'Mara', relation: 'Sister', phone: 'CANARY-PHONE', email: 'canary@example.test', birthday: '03-14', dates: [{ title: 'CANARY-DATE' }], notes: [{ id: 'a', text: 'Likes lemon cake' }], gifts: [{ id: 'b', text: 'Linen apron' }], times: [{ id: 'c', text: 'Lake weekend' }], createdAt: day }] });
    expect(rows[0].ref).toEqual({ app: 'philia', kind: 'person', id: 'p1' });
    expect(rows[0].open).toBe('/philia/?open=person%3Ap1');
    expect(text(rows)).toMatch(/Sister.*lemon cake.*Linen apron.*Lake weekend/s);
    expect(text(rows)).not.toMatch(/CANARY|canary|03-14/);
  });
});

describe('Ktema', () => {
  it('holds a thing’s name, make and model, place and note, never its serial number, price or warranty', async () => {
    const { ktemaSearch } = await import('../../ktema/providers/search');
    const rows = await run(ktemaSearch, {
      'local:ktema:thing:': [{ id: 't1', name: 'Dishwasher', category: 'Appliance', make: 'Bosch', model: 'S100', serial: 'CANARY-SERIAL', price: 'CANARY-PRICE', warrantyUntil: '2030-01-01', place: 'Kitchen', note: 'Under warranty', createdAt: day }],
      'local:ktema:upkeep:': [{ id: 'u1', name: 'Clean the filter', note: 'Every three months', createdAt: day }],
    });
    expect(rows.map((row) => row.ref.kind).sort()).toEqual(['thing', 'upkeep']);
    expect(text(rows)).toMatch(/Bosch S100.*Kitchen.*Under warranty/s);
    expect(text(rows)).toContain('Every three months');
    expect(text(rows)).not.toMatch(/CANARY|2030/);
  });
});

describe('Poreia', () => {
  it('holds trips, bookings and plans by name, place, provider and notes, never a confirmation code or cost', async () => {
    const { poreiaSearch } = await import('../../poreia/providers/search');
    const rows = await run(poreiaSearch, {
      'local:poreia:trip:': [{ id: 'tr1', name: 'Lisbon', place: { label: 'Lisbon' }, notes: 'Spring trip', createdAt: day }],
      'local:poreia:booking:': [{ id: 'b1', tripId: 'tr1', kind: 'stay', title: 'Hotel Alfama', provider: 'Booking', confirmation: 'CANARY-CODE', address: 'Rua 1', cost: { amount: 123456, currency: 'EUR' }, notes: 'Late arrival', createdAt: day, updatedAt: day }],
      'local:poreia:plan:': [{ id: 'pn1', tripId: 'tr1', date: '2026-12-01', title: 'Tram 28', where: 'Alfama', note: 'Go early', createdAt: day, updatedAt: day }],
    });
    expect(rows.map((row) => row.ref.kind).sort()).toEqual(['booking', 'plan', 'trip']);
    expect(rows.find((row) => row.ref.kind === 'booking')?.label).toBe('Stay in Lisbon');
    expect(rows.find((row) => row.ref.kind === 'plan')?.label).toBe('Plan in Lisbon');
    expect(text(rows)).toMatch(/Booking.*Rua 1.*Late arrival/s);
    expect(text(rows)).not.toMatch(/CANARY|123456/);
  });
});

describe('Askesis', () => {
  const entry = (extra: Record<string, unknown> = {}) => ({ id: 'e1', activity: 'run', date: '2026-10-20', notes: 'Felt easy', wentWell: 'Pacing', nextTime: 'Longer', intention: 'Stay loose', avgHr: 987, meters: 5000, seconds: 1800, createdAt: day, ...extra });
  it('holds an entry’s title and words, never heart rate or distance, and skips an entry with no words', async () => {
    const { askesisSearch } = await import('../../askesis/providers/search');
    const rows = await run(askesisSearch, { askesisWorkouts: [entry(), entry({ id: 'e2', notes: undefined, wentWell: undefined, nextTime: undefined, intention: undefined })] });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Run in Askesis');
    expect(rows[0].open).toBe('/askesis/?open=entry%3Ae1');
    expect(text(rows)).toMatch(/Felt easy.*Pacing.*Longer.*Stay loose/s);
    expect(text(rows)).not.toMatch(/987|5000|1800/);
  });
  it('names a run’s day the same in every time zone', async () => {
    const { askesisSearch } = await import('../../askesis/providers/search');
    const original = process.env.TZ;
    try {
      for (const zone of ['UTC', 'Pacific/Auckland', 'America/Los_Angeles', 'Pacific/Pago_Pago', 'Pacific/Kiritimati', 'Asia/Kolkata']) {
        process.env.TZ = zone;
        const rows = await run(askesisSearch, { askesisWorkouts: [entry()] });
        expect(rows[0].title, zone).toMatch(/^Run, (Oct\s*20|20\s*Oct)/);
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
  it('says Today and Yesterday by the person’s own calendar day', async () => {
    const { askesisSearch } = await import('../../askesis/providers/search');
    const rows = await run(askesisSearch, { askesisWorkouts: [entry({ id: 'a', date: TODAY }), entry({ id: 'b', date: '2026-11-04' })] });
    expect(rows.map((row) => row.title).sort()).toEqual(['Run, Today', 'Run, Yesterday']);
  });
});
