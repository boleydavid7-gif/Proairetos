import { describe, expect, it } from 'vitest';
import { billFromText, receiptFromText } from '../../core/ocr/labels';
import { CASES } from './fixtures';

const value = (found: { key: string; value: string }[], key: string) => found.find((each) => each.key === key)?.value;

describe('the reading test set', () => {
  for (const each of CASES) {
    it(each.name, () => {
      const found = (each.kind === 'bill' ? billFromText : receiptFromText)(each.text, each.year);
      expect(value(found, 'amount')).toBe(each.amount);
      if (each.kind === 'bill') expect(value(found, 'due')).toBe(each.due);
      else expect(value(found, 'date')).toBe(each.date);
    });
  }
});
