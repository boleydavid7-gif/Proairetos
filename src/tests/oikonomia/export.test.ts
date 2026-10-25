import { describe, expect, it } from 'vitest';
import { billsCsv, envelopesCsv, expensesCsv } from '../../oikonomia/core/export';

describe('Oikonomia readable exports', () => {
  it('quotes commas and keeps bill payments in the CSV', () => {
    const text = billsCsv([{ id: 'b', name: 'Rent, home', amountCents: 125000, currency: 'USD', dueDate: '2026-10-01', frequency: 'monthly', autopay: false, reminderDays: 3, payments: [{ id: 'p', date: '2026-10-01', amountCents: 125000 }], createdAt: '', updatedAt: '' }]);
    expect(text).toContain('"Rent, home"');
    expect(text).toContain('"[{""id"":""p""');
  });

  it('exports expenses with their chosen currency and envelopes with balances', () => {
    expect(expensesCsv([{ id: 'e', date: '2026-10-02', description: 'Coffee, shop', amountCents: 450, area: 'food', budgetItemId: 'groceries' }], 'USD')).toContain('"Coffee, shop"');
    expect(expensesCsv([{ id: 'e', date: '2026-10-02', description: 'Coffee, shop', amountCents: 450, area: 'food', budgetItemId: 'groceries' }], 'USD')).toContain('groceries');
    expect(envelopesCsv([{ id: 'v', name: 'Vacation', currency: 'USD', balanceCents: 50000, targetCents: 100000, monthlyCents: 10000, entries: [], createdAt: '', updatedAt: '' }])).toContain('500.00');
  });
});
