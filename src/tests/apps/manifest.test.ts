import { describe, expect, it } from 'vitest';
import { APPS, APP_IDS, appById as find, validateManifest, type AppId, type AppManifest } from '../../core/apps';

const appById = (id: AppId): AppManifest => {
  const app = find(id);
  if (!app) throw new Error(id);
  return app;
};

const fake = (patch: Partial<AppManifest>): AppManifest => ({ ...appById('ktema'), ...patch });

describe('application manifest', () => {
  it('has no errors', () => {
    expect(validateManifest().errors).toEqual([]);
  });
  it('has one main app and keeps Praxis as a retired alias of Theoria', () => {
    expect(APPS.filter((a) => a.status === 'main').map((a) => a.id)).toEqual(['proairetos']);
    const praxis = appById('praxis');
    expect(praxis.status).toBe('retired');
    expect(praxis.aliasOf).toBe('theoria');
    expect(praxis.install.addable).toBe(false);
  });
  it('lists every id once', () => {
    expect(new Set(APP_IDS).size).toBe(APPS.length);
    expect(APPS.length).toBe(17);
  });
  it('states the search rules for Hydros and Oikonomia', () => {
    const oik = appById('oikonomia').search;
    expect(oik?.privacy).toBe('own-search');
    expect(oik?.excludes).toEqual(expect.arrayContaining(['amounts', 'account numbers', 'balances', 'statement lines', 'notes', 'transaction details']));
    expect(oik?.indexes).not.toContain('amounts');
    expect(appById('hydros').search?.windowDays).toBe(30);
  });
  it('rejects mistakes in a new entry', () => {
    const dupe = [...APPS, fake({})];
    expect(validateManifest(dupe).errors.join('\n')).toMatch(/more than once/);
    const badAddress = APPS.map((a) => (a.id === 'ktema' ? { ...a, urls: { ...a.urls, href: '/elsewhere/' } } : a));
    expect(validateManifest(badAddress).errors.length).toBeGreaterThan(0);
    const badRetired = APPS.map((a) => (a.id === 'praxis' ? { ...a, aliasOf: undefined } : a));
    expect(validateManifest(badRetired).errors.length).toBeGreaterThan(0);
    const noExcludes = APPS.map((a) => (a.id === 'oikonomia' && a.search ? { ...a, search: { ...a.search, excludes: [] } } : a));
    expect(validateManifest(noExcludes).errors.length).toBeGreaterThan(0);
  });
  it('accepts a new app with its own address and claims, with warnings only', () => {
    const k = appById('ktema');
    const next = {
      ...k,
      id: 'newapp',
      urls: { href: '/newapp/', scope: '/newapp/', entry: 'newapp/index.html' },
      data: { ...k.data, backupPrefix: 'newapp:' },
      notices: { source: 'newapp', kinds: ['newapp-kind'], switches: [{ key: 'newapp-switch', label: 'New app' }], page: 99, mainWrites: false },
      today: undefined,
      provides: undefined,
      home: undefined,
      search: undefined,
    } as unknown as AppManifest;
    expect(validateManifest([...APPS, next]).errors).toEqual([]);
  });
});
