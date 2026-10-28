// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { addApp, addedApps, isAdded, removeApp, usedApps } from '../../app/family/added';

describe('added apps', () => {
  beforeEach(() => localStorage.clear());

  it('finds the apps already used on this device', () => {
    expect(usedApps(['askesis:settings', 'somaShared.items.1', 'proairetos.praxisCards', 'proairetos.name'])).toEqual(['askesis', 'soma', 'praxis']);
  });

  it('starts from the apps used here, then keeps the choice', () => {
    localStorage.setItem('ktema:settings', '{}');
    expect(addedApps()).toEqual(['ktema']);
    addApp('philia');
    removeApp('ktema');
    localStorage.setItem('ergon:chore:1', '{}');
    expect(addedApps()).toEqual(['philia']);
    expect(isAdded('ergon')).toBe(false);
    expect(isAdded('proairetos')).toBe(true);
  });

  it('leaves out apps no longer offered, keeping the choice; Praxis follows Theoria', () => {
    localStorage.setItem('proairetos.apps', JSON.stringify({ added: ['hydros', 'praxis', 'ktema'] }));
    expect(addedApps()).toEqual(['ktema']);
    expect(isAdded('hydros')).toBe(false);
    expect(isAdded('praxis')).toBe(false);
    addApp('theoria');
    expect(isAdded('praxis')).toBe(true);
    expect(JSON.parse(localStorage.getItem('proairetos.apps') ?? '{}').added).toEqual(['hydros', 'praxis', 'ktema', 'theoria']);
  });
});
