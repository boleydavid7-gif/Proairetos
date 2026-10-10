import { describe, expect, it } from 'vitest';
import { byArea, cents, guessArea, merchantKey, newLines, readStatement } from '../../oikonomia/core/statements';
import { findJudgmentLanguage } from '../../core/rules/languageRules';
import { readFileSync } from 'node:fs';

describe('a statement brought in', () => {
  it('reads amounts as banks write them', () => {
    expect([cents('1,234.56'), cents('(12.00)'), cents('-4.50'), cents('12,50'), cents('$ 7'), cents('')]).toEqual([123456, -1200, -450, 1250, 700, undefined]);
  });

  it('keeps only money out from a single amount column, with ISO dates', () => {
    const csv = 'Date,Description,Amount,Balance\n2026-10-01,TRADER JOE\'S #123,-54.20,1000\n2026-10-02,PAYROLL ACME,2500.00,3500\n2026-10-03,NETFLIX.COM,-15.49,3484.51\n';
    expect(readStatement(csv)).toEqual([
      { date: '2026-10-01', description: "TRADER JOE'S #123", amountCents: 5420 },
      { date: '2026-10-03', description: 'NETFLIX.COM', amountCents: 1549 },
    ]);
  });

  it('reads debit and credit columns and day-first dates, after account lines', () => {
    const csv = 'Account,12345678\nStatement,October\n\nDate,Details,Money out,Money in\n15/10/2026,TESCO STORES,23.10,\n16/10/2026,Salary,,1800.00\n17/10/2026,TFL TRAVEL,4.90,\n';
    expect(readStatement(csv)).toEqual([
      { date: '2026-10-15', description: 'TESCO STORES', amountCents: 2310 },
      { date: '2026-10-17', description: 'TFL TRAVEL', amountCents: 490 },
    ]);
  });

  it('takes card exports where spending is positive', () => {
    const csv = 'Transaction Date,Description,Amount\n10/05/2026,SHELL OIL 123,40.00\n10/06/2026,STARBUCKS,5.25\n10/07/2026,PAYMENT THANK YOU,-200.00\n';
    const read = readStatement(csv)!;
    expect(read.map((line) => [line.description, line.amountCents])).toEqual([['SHELL OIL 123', 4000], ['STARBUCKS', 525]]);
  });

  it('says nothing for a file that is not a statement', () => {
    expect(readStatement('Name,Email\nA,b@c.d')).toBeUndefined();
  });

  it('guesses an area from the words, and remembers the person’s own moves', () => {
    expect(guessArea("TRADER JOE'S #123")).toBe('food');
    expect(guessArea('SHELL OIL 123')).toBe('transport');
    expect(guessArea('NETFLIX.COM')).toBe('subscriptions');
    expect(guessArea('CORNER SHOP 42')).toBe('other');
    expect(merchantKey('POS CORNER SHOP 42 LONDON')).toBe('corner shop london');
    expect(guessArea('CORNER SHOP 7 LONDON', { 'corner shop london': 'food' })).toBe('food');
  });

  it('brings in only new lines, and totals by area', () => {
    const kept = [{ date: '2026-10-01', description: 'A', amountCents: 100 }];
    expect(newLines(kept, [...kept, { date: '2026-10-02', description: 'B', amountCents: 200 }])).toHaveLength(1);
    expect(byArea([
      { id: '1', date: '2026-10-01', description: 'a', amountCents: 500, area: 'food' },
      { id: '2', date: '2026-10-02', description: 'b', amountCents: 900, area: 'transport' },
      { id: '3', date: '2026-10-03', description: 'c', amountCents: 700, area: 'food' },
    ])).toEqual([{ area: 'food', cents: 1200, count: 2 }, { area: 'transport', cents: 900, count: 1 }]);
  });

  it('uses plain words', () => {
    expect(findJudgmentLanguage(readFileSync('src/oikonomia/core/statements.ts', 'utf8'))).toEqual([]);
  });
});
