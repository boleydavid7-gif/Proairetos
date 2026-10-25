import { describe, expect, it } from 'vitest';
import { billFromText, dateIn, medicineFromText, receiptFromText, thingFromText } from '../../core/ocr/labels';

const value = (found: { key: string; value: string }[], key: string) => found.find((each) => each.key === key)?.value;

describe('reading a medicine label', () => {
  it('takes the name and strength from the same line', () => {
    const found = medicineFromText('CVS Pharmacy\nIBUPROFEN 200 MG TABLETS\nQty: 50\nTake 1 tablet by mouth every 6 hours with food');
    expect(value(found, 'name')).toBe('Ibuprofen');
    expect(value(found, 'dose')).toBe('200 mg');
    expect(value(found, 'how')).toMatch(/^Take 1 tablet/);
  });

  it('reads liquids and units', () => {
    const found = medicineFromText('Amoxicillin\nOral suspension 250mg/5ml');
    expect(value(found, 'name')).toBe('Amoxicillin');
    expect(value(found, 'dose')).toBe('250 mg / 5 ml');
    expect(value(medicineFromText('Vitamin D3 1000 IU'), 'dose')).toBe('1000 IU');
  });
});

describe('reading a rating plate', () => {
  it('finds model and serial', () => {
    const found = thingFromText('BOSCH\nModel: SHX878WD5N\nSerial No. FD9801 12345\nS/N 0123456789\n120V 60Hz');
    expect(value(found, 'model')).toBe('SHX878WD5N');
    expect(value(found, 'serial')).toBe('FD9801');
    expect(value(thingFromText('M/N: WF45R6100AW  S/N: 0ABC12DEF345'), 'serial')).toBe('0ABC12DEF345');
    expect(value(thingFromText('M/N: WF45R6100AW  S/N: 0ABC12DEF345'), 'model')).toBe('WF45R6100AW');
  });
});

describe('reading a bill', () => {
  it('prefers the amount due and the due date', () => {
    const found = billFromText('City Power\nPrevious balance $80.12\nAmount due $64.30\nDue date: Oct 21, 2026', 2026);
    expect(value(found, 'amount')).toBe('80.12');
    expect(value(found, 'due')).toBe('2026-10-21');
  });

  it('takes the amount from the next line, and European numbers', () => {
    expect(value(billFromText('Total due\n€ 1.234,56\nPay by 03/11/2026'), 'amount')).toBe('1234.56');
    expect(value(billFromText('Total due\n€ 1.234,56\nPay by 03/11/2026'), 'due')).toBe('2026-03-11');
  });

  it('requires decimals and keeps grouped thousands when cents are present', () => {
    expect(value(billFromText('Amount due\n$1,000'), 'amount')).toBeUndefined();
    expect(value(billFromText('Total due\n$1,000.50'), 'amount')).toBe('1000.50');
  });

  it('reads dates written several ways', () => {
    expect(dateIn('2026-10-01')).toBe('2026-10-01');
    expect(dateIn('25/12/2026')).toBe('2026-12-25');
    expect(dateIn('1st November 2026')).toBe('2026-11-01');
    expect(dateIn('Due Dec 5', 2026)).toBe('2026-12-05');
  });
});

it('leaves the biller blank for offline OCR', () => {
  expect(billFromText('City Power\nStatement date 10/01/2026\nAmount due $64.30').some((each) => each.key === 'name')).toBe(false);
});

it('reads a receipt total and transaction date without calling it a due date', () => {
  const found = receiptFromText('Corner Market\nTransaction date 10/24/2026\nTotal $18.75', 2026);
  expect(value(found, 'amount')).toBe('18.75');
  expect(value(found, 'date')).toBe('2026-10-24');
  expect(found.some((each) => each.key === 'due')).toBe(false);
});

it('prefers the labelled receipt total over an item price', () => {
  const found = receiptFromText('Market\nItem 19.9\nTax 2.14\nTOTAL: 31.62\n10/22/26 04:34pm', 2026);
  expect(value(found, 'amount')).toBe('31.62');
  expect(value(found, 'date')).toBe('2026-10-22');
});

it('uses the largest decimal amount when no labeled total exists', () => {
  expect(value(receiptFromText('Kroger\nREF 937392-406\nItem 19.99\nTax 2.14', 2026), 'amount')).toBe('19.99');
});
