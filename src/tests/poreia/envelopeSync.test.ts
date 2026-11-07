import { describe, expect, it } from 'vitest';
import { planEnvelopeSync } from '../../poreia/core/envelopeSync';

const today = '2026-10-22';
const usd = (cents: number) => ({ cents, currency: 'USD' });

describe('a trip and its Oikonomia envelope', () => {
  it('fills what the other is missing the first time', () => {
    const plan = planEnvelopeSync({ name: 'Lisbon', budget: usd(300000), start: '2027-05-12' }, { name: 'Lisbon', target: 0, currency: 'USD' }, undefined, today);
    expect(plan.envelope).toEqual({ target: 300000, date: '2027-05-12' });
    expect(plan.trip).toBeUndefined();
    const back = planEnvelopeSync({ name: 'Lisbon' }, { name: 'Lisbon', target: 150000, currency: 'USD' }, undefined, today);
    expect(back.trip).toEqual({ budget: usd(150000) });
  });

  it('passes the trip’s changes out', () => {
    const seen = { name: 'Lisbon', target: 300000, date: '2027-05-12', tripName: 'Lisbon', budget: 300000, start: '2027-05-12' };
    const plan = planEnvelopeSync({ name: 'Lisbon and Porto', budget: usd(400000), start: '2027-06-01' }, { name: 'Lisbon', target: 300000, date: '2027-05-12', currency: 'USD' }, seen, today);
    expect(plan.envelope).toEqual({ name: 'Lisbon and Porto', target: 400000, date: '2027-06-01' });
    expect(plan.trip).toBeUndefined();
    expect(plan.seen).toMatchObject({ name: 'Lisbon and Porto', target: 400000, budget: 400000 });
  });

  it('brings Oikonomia’s changes back, but never moves the trip’s dates', () => {
    const seen = { name: 'Lisbon', target: 300000, date: '2027-05-12', tripName: 'Lisbon', budget: 300000, start: '2027-05-12' };
    const plan = planEnvelopeSync({ name: 'Lisbon', budget: usd(300000), start: '2027-05-12' }, { name: 'Portugal', target: 350000, date: '2027-04-01', currency: 'USD' }, seen, today);
    expect(plan.trip).toEqual({ name: 'Portugal', budget: usd(350000) });
    expect(plan.envelope).toBeUndefined();
  });

  it('when both changed the same thing, the trip’s change goes out', () => {
    const seen = { name: 'Lisbon', target: 300000, tripName: 'Lisbon', budget: 300000 };
    const plan = planEnvelopeSync({ name: 'Lisbon', budget: usd(320000) }, { name: 'Lisbon', target: 280000, currency: 'USD' }, seen, today);
    expect(plan.envelope).toEqual({ target: 320000 });
    expect(plan.trip).toBeUndefined();
  });

  it('leaves a budget in another currency alone, and does nothing when nothing changed', () => {
    const seen = { name: 'Lisbon', target: 100, tripName: 'Lisbon', budget: undefined };
    const plan = planEnvelopeSync({ name: 'Lisbon', budget: { cents: 999, currency: 'EUR' } }, { name: 'Lisbon', target: 100, currency: 'USD' }, seen, today);
    expect(plan.envelope).toBeUndefined();
    expect(plan.trip).toBeUndefined();
  });
});
