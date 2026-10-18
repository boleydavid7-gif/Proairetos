import { addEnvelopeEntry, envelopeMonthlyTotal, envelopeProgress, normalizeEnvelope, newEnvelope } from '../../oikonomia/core/envelopes';

describe('Oikonomia savings envelopes', () => {
  it('creates a target and tracks additions and use as activity', () => {
    const start = { ...newEnvelope('Vacation', 'USD', '2026-10-01T00:00:00.000Z', 'vacation'), targetCents: 200000, monthlyCents: 25000 };
    const added = addEnvelopeEntry(start, 50000, 'First transfer', '2026-10-02', 'entry-1');
    const used = addEnvelopeEntry(added, -12000, 'Deposit', '2026-10-03', 'entry-2');
    expect(used.balanceCents).toBe(38000);
    expect(used.entries.map((entry) => entry.amountCents)).toEqual([50000, -12000]);
    expect(envelopeProgress(used)).toBe(19);
  });

  it('sums only monthly contributions in the chosen currency', () => {
    const usd = { ...newEnvelope('Vacation', 'USD'), monthlyCents: 25000 };
    const cad = { ...newEnvelope('Car', 'CAD'), monthlyCents: 10000 };
    expect(envelopeMonthlyTotal([usd, cad], 'USD')).toBe(25000);
  });

  it('normalizes older or partial records without losing a valid goal', () => {
    expect(normalizeEnvelope({ id: 'x', name: 'Emergency', targetCents: 100000, balanceCents: 20000, entries: [] })).toMatchObject({
      id: 'x',
      name: 'Emergency',
      currency: 'USD',
      targetCents: 100000,
      balanceCents: 20000,
      monthlyCents: 0,
    });
  });
});
