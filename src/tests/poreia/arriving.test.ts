import { describe, expect, it } from 'vitest';
import { adviceFor, emergencyIn, emergencyLines, plugNote, powerIn, wikiSection } from '../../poreia/core/arriving';
import { docsFor, expiryFact, monthsBetween, needsLook, masked, type TravelDoc } from '../../poreia/core/documents';

describe('arriving', () => {
  it('says emergency numbers plainly, joining services that share one', () => {
    expect(emergencyLines(emergencyIn('PT')!)).toEqual(['112']);
    expect(emergencyLines(emergencyIn('JP')!)).toEqual(['Police 110', 'Ambulance and fire 119']);
    expect(emergencyIn('xx')).toBeUndefined();
  });

  it('compares plugs and current with home', () => {
    expect(plugNote(powerIn('US'), powerIn('GB')!)).toBe('An adapter is needed for these plugs; the current is 230 V, home is 120 V.');
    expect(plugNote(powerIn('DE'), powerIn('FR')!)).toBe('Same plugs and current as home.');
    expect(plugNote(powerIn('US'), powerIn('JP')!)).toBe('Some plugs fit; the current is 100 V, home is 120 V.');
    expect(plugNote(undefined, powerIn('JP')!)).toBeUndefined();
  });

  it('points to the home government, else IATA', () => {
    expect(adviceFor('gb').url).toContain('gov.uk');
    expect(adviceFor('US').name).toContain('State');
    expect(adviceFor('BR').url).toContain('iatatravelcentre');
    expect(adviceFor(undefined).url).toContain('iatatravelcentre');
  });

  it('reads a section of a Wikivoyage page as plain words', () => {
    const page = ['==Buy==', 'Money things.', '===Tipping===', "Tipping is '''not''' expected; round up for [[taxi|taxis]].", '* 10% in restaurants{{ref}}', '===Shopping===', 'Shops.'].join('\n');
    expect(wikiSection(page, /^tipping$/i)).toBe('Tipping is not expected; round up for taxis. 10% in restaurants');
    expect(wikiSection(page, /^nothing$/i)).toBeUndefined();
    const long = `===Tipping===\n${'Words here. '.repeat(100)}`;
    expect(wikiSection(long, /tipping/i, 50)!.length).toBeLessThanOrEqual(51);
  });
});

describe('documents', () => {
  const doc = (patch: Partial<TravelDoc>): TravelDoc => ({ id: 'd', kind: 'passport', name: 'Passport', createdAt: '', updatedAt: '', ...patch });
  const trip = { start: '2027-03-01', end: '2027-03-10' };

  it('counts months by the calendar', () => {
    expect(monthsBetween('2027-03-10', '2027-09-10')).toBe(6);
    expect(monthsBetween('2027-03-10', '2027-09-09')).toBe(5);
  });

  it('says how an end date sits against the trip', () => {
    expect(expiryFact(doc({ expires: '2027-03-05' }), trip)).toMatch(/before the trip is over/);
    expect(expiryFact(doc({ expires: '2027-06-01' }), trip)).toMatch(/2 months after the trip; many countries ask for six/);
    expect(expiryFact(doc({ expires: '2028-06-01' }), trip)).toMatch(/^Valid until/);
    expect(expiryFact(doc({ kind: 'insurance', expires: '2027-04-01' }), trip)).toMatch(/^Valid until/);
    expect(expiryFact(doc({ expires: '2026-01-01' }), trip, '2026-10-22')).toMatch(/^Ended/);
    expect(expiryFact(doc({}), trip)).toBeUndefined();
    expect(needsLook(doc({ expires: '2027-06-01' }), trip)).toBe(true);
    expect(needsLook(doc({ expires: '2028-06-01' }), trip)).toBe(false);
  });

  it('keeps every-trip documents and the trip’s own', () => {
    const list = [doc({ id: 'a' }), doc({ id: 'b', tripId: 't1', kind: 'visa' }), doc({ id: 'c', tripId: 't2' })];
    expect(docsFor(list, 't1').map((each) => each.id)).toEqual(['a', 'b']);
    expect(masked('X1234567')).toBe('•••• 4567');
  });
});
