import { describe, expect, it } from 'vitest';
import { readPhrases } from '../../poreia/core/phrases';
import { missionQuery, readMissions } from '../../poreia/core/embassy';
import { loyaltyFor, type TravelDoc } from '../../poreia/core/documents';

describe('phrases', () => {
  it('reads phrasebook lines, everyday ones first', () => {
    const wikitext = [
      '== Phrase list ==',
      '=== Basics ===',
      "; Good night : ''Boa noite'' (BOH-ah NOY-teh)",
      "; Thank you : ''Obrigado'' (oh-bree-GAH-doo)",
      "; Hello : ''[[Olá]]'' (oh-LAH)",
      "; Hello : ''Oi''",
      '; Not a phrase line',
      "; Please : ''Por favor''",
    ].join('\n');
    expect(readPhrases(wikitext)).toEqual([
      { english: 'Hello', local: 'Olá', say: 'oh-LAH' },
      { english: 'Please', local: 'Por favor', say: undefined },
      { english: 'Thank you', local: 'Obrigado', say: 'oh-bree-GAH-doo' },
      { english: 'Good night', local: 'Boa noite', say: 'BOH-ah NOY-teh' },
    ]);
  });
});

describe('embassies', () => {
  it('asks for one country in another by code, and reads missions embassy first', () => {
    expect(missionQuery('us', 'PT')).toContain('wdt:P297 "US"');
    expect(missionQuery('us"; DROP', 'PT')).toContain('"USDROP"');
    const found = readMissions({
      results: {
        bindings: [
          { m: { value: 'Q2' }, mLabel: { value: 'Consulate General of the United States, Ponta Delgada' }, cityLabel: { value: 'Ponta Delgada' } },
          { m: { value: 'Q1' }, mLabel: { value: 'Embassy of the United States, Lisbon' }, address: { value: 'Av. das Forças Armadas' }, phone: { value: '+351 21 727 3300' }, coord: { value: 'Point(-9.15 38.75)' } },
          { m: { value: 'Q3' }, mLabel: { value: 'Q3' } },
        ],
      },
    });
    expect(found.map((each) => each.name)).toEqual(['Embassy of the United States, Lisbon', 'Consulate General of the United States, Ponta Delgada']);
    expect(found[0]).toMatchObject({ phone: '+351 21 727 3300', lat: 38.75, lon: -9.15 });
  });
});

describe('loyalty numbers', () => {
  const doc = (name: string, number?: string): TravelDoc => ({ id: name, kind: 'loyalty', name, number, createdAt: '', updatedAt: '' });
  it('matches a program to the booking provider by a shared word', () => {
    const all = [doc('Delta SkyMiles', 'DL123'), doc('Marriott Bonvoy', 'MB9'), doc('Hilton Honors'), { ...doc('Delta passport', 'P1'), kind: 'passport' as const }];
    expect(loyaltyFor(all, 'Delta').map((each) => each.number)).toEqual(['DL123']);
    expect(loyaltyFor(all, 'Marriott Lisbon')[0].number).toBe('MB9');
    expect(loyaltyFor(all, 'Hilton Garden Inn')).toEqual([]);
    expect(loyaltyFor(all, 'American Airlines')).toEqual([]);
    expect(loyaltyFor(all, undefined)).toEqual([]);
  });
});
