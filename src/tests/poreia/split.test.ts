import { describe, expect, it } from 'vitest';
import { balances, settleUp } from '../../poreia/core/split';

const usd = (dollars: number) => ({ cents: dollars * 100, currency: 'USD' });

describe('who paid what', () => {
  it('shares each payment evenly and says who is owed', () => {
    const { balances: list, leftOut } = balances(
      [
        { amount: usd(90), paidBy: 'Sam' },
        { amount: usd(30), paidBy: 'Alex' },
        { amount: usd(20), paidBy: 'Alex', for: ['Alex', 'Jo'] },
        { amount: usd(50) },
      ],
      ['Sam', 'Alex', 'Jo'],
      'USD',
    );
    expect(leftOut).toBe(1);
    expect(list.map((each) => [each.person, each.paid / 100, each.share / 100, each.net / 100])).toEqual([
      ['Sam', 90, 40, 50],
      ['Alex', 50, 50, 0],
      ['Jo', 0, 50, -50],
    ]);
    expect(settleUp(list)).toEqual([{ from: 'Jo', to: 'Sam', cents: 5000 }]);
  });

  it('converts other currencies and keeps every cent', () => {
    const { balances: list } = balances([{ amount: { cents: 1000, currency: 'EUR' }, paidBy: 'Sam' }], ['Sam', 'Alex', 'Jo'], 'USD', { EUR: 1.1 });
    expect(list.reduce((sum, each) => sum + each.share, 0)).toBe(1100);
    expect(list.find((each) => each.person === 'Sam')!.paid).toBe(1100);
    expect(settleUp(list).reduce((sum, each) => sum + each.cents, 0)).toBe(1100 - list.find((each) => each.person === 'Sam')!.share);
  });

  it('leaves out a payment with no rate yet', () => {
    expect(balances([{ amount: { cents: 500, currency: 'JPY' }, paidBy: 'Sam' }], ['Sam'], 'USD').leftOut).toBe(1);
  });
});
