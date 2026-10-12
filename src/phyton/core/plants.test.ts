import { describe, expect, it } from 'vitest';
import { dayText, everyNow, feed, grouped, learnedEvery, nextCheck, nextFeed, seasonFactor, stillMoist, toFeed, water, wateredText, type Plant } from './plants';
import { findSpecies, speciesForLatin, SPECIES } from './species';
import { plantNotices, defaultPlantNotices } from './notices';
import { phytonYear } from './year';

const plant = (patch: Partial<Plant> = {}): Plant => ({ id: 'p1', name: 'Pothos', species: 'pothos', every: 7, log: [], createdAt: '2026-06-01T10:00:00.000Z', ...patch });
const watered = (...dates: string[]) => dates.map((date) => ({ date, kind: 'water' as const }));

describe('when a plant comes round', () => {
  it('starts on the day it was added, then counts from the last watering', () => {
    expect(nextCheck(plant(), '2026-06-01')).toBe('2026-06-01');
    expect(nextCheck(water(plant(), '2026-06-03'), '2026-06-03')).toBe('2026-06-10');
  });

  it('waits a few days after Still moist, and the record follows what was done', () => {
    const p = stillMoist(water(plant(), '2026-06-03'), '2026-06-10');
    expect(nextCheck(p, '2026-06-10')).toBe('2026-06-12');
    expect(p.checkFrom).toBe('2026-06-12');
    expect(water(p, '2026-06-12').checkFrom).toBeUndefined();
  });

  it('learns the days between waterings from the middle of the last gaps', () => {
    const p = plant({ log: watered('2026-06-01', '2026-06-10', '2026-06-19', '2026-06-29') });
    expect(learnedEvery(p)).toBe(9);
    // One watering alone keeps the days chosen.
    expect(learnedEvery(plant({ log: watered('2026-06-01') }))).toBe(7);
    // Time away is not the plant's rhythm.
    expect(learnedEvery(plant({ log: watered('2026-06-01', '2026-06-08', '2026-09-20', '2026-09-27') }))).toBe(7);
  });

  it('stretches in winter, by hemisphere', () => {
    expect(seasonFactor('2026-01-10')).toBe(1.5);
    expect(seasonFactor('2026-07-10')).toBe(1);
    expect(seasonFactor('2026-07-10', 'south')).toBe(1.5);
    expect(everyNow(plant(), '2026-12-15')).toBe(11);
    expect(everyNow(plant(), '2026-11-15')).toBe(9);
  });

  it('counts rain for plants outside only', () => {
    const p = water(plant({ outside: true }), '2026-06-01');
    const rain = { '2026-06-05': 12, '2026-06-06': 2 };
    expect(nextCheck(p, '2026-06-06', 'north', rain)).toBe('2026-06-12');
    expect(wateredText(p, '2026-06-07', rain)).toBe('Rain 2 days ago');
    expect(nextCheck({ ...p, outside: false }, '2026-06-06', 'north', rain)).toBe('2026-06-08');
  });

  it('groups plants by the day they come round and never calls them late', () => {
    const today = '2026-06-20';
    const g = grouped([plant({ id: 'a', name: 'A', log: watered('2026-06-01') }), plant({ id: 'b', name: 'B', log: watered('2026-06-18') }), plant({ id: 'c', name: 'C', every: 30, log: watered('2026-06-19') })], today);
    expect(g.now.map((p) => p.name)).toEqual(['A']);
    expect(g.week.map((p) => p.name)).toEqual(['B']);
    expect(g.later.map((p) => p.name)).toEqual(['C']);
    expect(dayText('2026-06-08', today)).toMatch(/^Since /);
  });
});

describe('feeding', () => {
  it('comes round in spring and summer and waits for spring otherwise', () => {
    const p = feed(plant({ feedEvery: 4 }), '2026-06-01');
    expect(nextFeed(p, '2026-06-02')).toBe('2026-06-29');
    const late = feed(plant({ feedEvery: 4 }), '2026-09-20');
    expect(nextFeed(late, '2026-09-21')).toBe('2027-03-01');
    expect(toFeed([plant({ feedEvery: 4 })], '2026-06-05').length).toBe(1);
    expect(toFeed([plant({ feedEvery: 4 })], '2026-12-05').length).toBe(0);
    expect(nextFeed(plant(), '2026-06-05')).toBeUndefined();
  });
});

describe('plant types', () => {
  it('finds types by any of their names', () => {
    expect(findSpecies('devils ivy')[0].key).toBe('pothos');
    expect(findSpecies('sansevieria')[0].key).toBe('snake-plant');
    expect(findSpecies('monst')[0].key).toBe('monstera');
  });

  it('matches an identification by Latin name, then by a genus it holds once', () => {
    expect(speciesForLatin('Epipremnum aureum')?.key).toBe('pothos');
    expect(speciesForLatin('Spathiphyllum cochlearispathum', 'Spathiphyllum')?.key).toBe('peace-lily');
    expect(speciesForLatin('Begonia rex', 'Begonia')?.key).toBe('begonia');
    expect(speciesForLatin('Quercus robur', 'Quercus')).toBeUndefined();
  });

  it('keeps every type complete, with unique keys', () => {
    expect(new Set(SPECIES.map((each) => each.key)).size).toBe(SPECIES.length);
    for (const each of SPECIES) expect(each.water).toBeGreaterThan(0);
  });
});

describe('notices', () => {
  it('names the plants to check that day, once, at the chosen time', () => {
    const now = new Date(2026, 5, 20, 8, 0);
    const list = [plant({ id: 'a', name: 'Fern', log: watered('2026-06-14') }), plant({ id: 'b', name: 'Pothos', log: watered('2026-06-14') })];
    const notices = plantNotices(list, defaultPlantNotices, undefined, '2026-06-20', 3, now);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'plant', title: '2 plants to check', open: 'phyton:today' });
    expect(notices[0].body).toContain('Fern, Pothos');
    expect(plantNotices(list, { ...defaultPlantNotices, on: false }, undefined, '2026-06-20', 3, now)).toEqual([]);
  });

  it('leaves out others’ plants with Only mine', () => {
    const now = new Date(2026, 5, 20, 8, 0);
    const list = [plant({ id: 'a', name: 'Fern', who: 'Sam', log: watered('2026-06-14') })];
    expect(plantNotices(list, { ...defaultPlantNotices, onlyMine: true }, 'Alex', '2026-06-20', 3, now)).toEqual([]);
  });
});

describe('the year', () => {
  it('counts waterings, feeds and repots, with plants added', () => {
    const p = plant({ log: [...watered('2026-02-01', '2026-03-01'), { date: '2026-04-01', kind: 'repot' }, { date: '2026-04-02', kind: 'moist' }] });
    const year = phytonYear([p], 2026);
    expect(year.facts.map((fact) => fact.label)).toEqual(['Waterings', 'Repotted', 'Plants added']);
    expect(phytonYear([p], 2025).facts).toEqual([]);
  });

  it('keeps counting past the kept record, and a record stays small enough to share', () => {
    let p = plant({ name: 'A rather long plant name for the kitchen window' });
    for (let day = 0; day < 120; day += 1) p = water(p, `2026-${String(1 + Math.floor(day / 28)).padStart(2, '0')}-${String(1 + (day % 28)).padStart(2, '0')}`, 'Someone');
    expect(p.log).toHaveLength(40);
    expect(phytonYear([p], 2026).facts[0]).toEqual({ label: 'Waterings', value: '120' });
    // Sealed with AES-GCM and base64: about 4/3 of the JSON, under the server's 4,000.
    expect(Math.ceil((JSON.stringify(p).length + 28) * 4 / 3)).toBeLessThan(4000);
  });
});
