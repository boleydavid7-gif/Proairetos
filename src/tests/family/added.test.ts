// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { addApp, addedApps, isAdded, removeApp, usedApps } from '../../app/family/added';

describe('added apps', () => {
  beforeEach(() => localStorage.clear());

  it('finds the apps already used on this device', () => {
    expect(usedApps(['askesis:settings', 'somaShared.items.1', 'proairetos.praxisCards', 'proairetos.name'])).toEqual(['askesis', 'soma', 'praxis']);
  });

  it('starts from the apps used here, then keeps the choice', () => {
    localStorage.setItem('hydros:settings', '{}');
    expect(addedApps()).toEqual(['hydros']);
    addApp('philia');
    removeApp('hydros');
    localStorage.setItem('ergon:chore:1', '{}');
    expect(addedApps()).toEqual(['philia']);
    expect(isAdded('ergon')).toBe(false);
    expect(isAdded('proairetos')).toBe(true);
  });
});
