// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { addApp, isAdded } from '../../app/family/added';
import { mayUse } from '../../app/family/purchases';

describe('paying for add-ons', () => {
  beforeEach(() => localStorage.clear());

  it('keeps every add-on free while the Store takes no payments', () => {
    addApp('soma');
    expect(mayUse('soma')).toBe(true);
    expect(isAdded('soma')).toBe(true);
  });

  it('once paid, opens only what the account bought; Proairetos stays free', () => {
    localStorage.setItem('proairetosStore', JSON.stringify({ paid: true, price: 499, currency: 'usd' }));
    localStorage.setItem('proairetosOwned', JSON.stringify({ apps: ['soma'] }));
    addApp('soma');
    addApp('ergon');
    expect(isAdded('soma')).toBe(true);
    expect(isAdded('ergon')).toBe(false);
    expect(isAdded('proairetos')).toBe(true);
  });

  it('opens everything for a beta tester', () => {
    localStorage.setItem('proairetosStore', JSON.stringify({ paid: true, price: 499, currency: 'usd' }));
    localStorage.setItem('proairetosOwned', JSON.stringify({ apps: [], tester: true }));
    addApp('ergon');
    expect(isAdded('ergon')).toBe(true);
  });
});
