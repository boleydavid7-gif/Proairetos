/*
 * The reading test set: text as a phone's reader returns it (noise, wrapped lines, look-alike letters), with what a
 * person would fill in. Add real bills and receipts here as plain text (words only, no photos, no account numbers)
 * and every change to the readers is measured against them; `receipts.test.ts` fails on any field that moves.
 */
export type Case = { name: string; kind: 'bill' | 'receipt'; text: string; amount?: string; date?: string; due?: string; year?: number };

export const CASES: Case[] = [
  { name: 'cash handed over is larger than the total', kind: 'receipt', year: 2026, amount: '23.47', date: '2026-10-24', text: 'CORNER MARKET\n123 Main St\n10/24/2026 06:12 PM\nMilk 4.29\nBread 3.99\nEggs 5.49\nSUBTOTAL 21.67\nTAX 1.80\nTOTAL 23.47\nCASH 40.00\nCHANGE 16.53' },
  { name: 'total on the line after its word', kind: 'receipt', year: 2026, amount: '58.20', date: '2026-09-03', text: 'Hardware Depot\nSep 3 2026\nSubtotal\n53.89\nTax\n4.31\nTotal\n58.20\nVISA ****1234' },
  { name: 'a savings line larger than nothing, total below it', kind: 'receipt', year: 2026, amount: '64.10', text: 'FRESH FOODS\nYOU SAVED 12.40\nSUBTOTAL 60.05\nTAX 4.05\nBALANCE DUE 64.10\nPoints earned 64' },
  { name: 'look-alike letters in the total', kind: 'receipt', year: 2026, amount: '18.75', text: 'Cafe Uno\nSubtotal $l7.25\nTax $l.50\nTOTAL $l8.75' },
  { name: 'letter O for zero', kind: 'receipt', year: 2026, amount: '10.50', text: 'Bakery\nTotal $1O.5O' },
  { name: 'tip line after the total', kind: 'receipt', year: 2026, amount: '42.00', text: 'Bistro\nSubtotal 38.00\nTax 4.00\nTotal 42.00\nTip 8.00\nGrand 50.00' },
  { name: 'no label at all: largest outside tax and change lines', kind: 'receipt', year: 2026, amount: '19.99', text: 'Kroger\nREF 937392-406\nItem 19.99\nTax 2.14' },
  { name: 'european receipt', kind: 'receipt', year: 2026, amount: '1234.56', date: '2026-03-11', text: 'Elektro Markt\n11.03.2026\nSumme 1.100,00\nMwSt 134,56\nTotal 1.234,56' },
  { name: 'previous balance is larger than the amount due', kind: 'bill', year: 2026, amount: '64.30', due: '2026-10-21', text: 'City Power\nPrevious balance $80.12\nPayment received $80.12\nAmount due $64.30\nDue date: Oct 21, 2026' },
  { name: 'due date wraps onto the next line', kind: 'bill', year: 2026, amount: '112.00', due: '2026-11-15', text: 'Water & Sewer\nStatement date 10/20/2026\nTotal amount due\n$112.00\nPayment due\nNov 15, 2026' },
  { name: 'statement date is not the due date', kind: 'bill', year: 2026, amount: '45.00', due: '2026-12-02', text: 'Mobile Co\nStatement date 11/10/2026\nPlease pay by 12/02/2026\nAmount due 45.00' },
  { name: 'minimum payment does not beat the amount due', kind: 'bill', year: 2026, amount: '842.10', due: '2026-10-30', text: 'Card Services\nNew balance $842.10\nMinimum payment due $35.00\nPayment due date 10/30/2026' },
  { name: 'only whole numbers are noise', kind: 'bill', year: 2026, text: 'Account 4455667788\nPhone 800 555 0199\nAmount due $1,000' },
  { name: 'gas bill with a balance forward and current charges', kind: 'bill', year: 2026, amount: '73.55', due: '2026-11-04', text: 'Gas Co\nBalance forward 0.00\nCurrent charges 73.55\nTotal due 73.55\nDue 11/04/2026' },
];
