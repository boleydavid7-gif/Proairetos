import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { providerModules } from '../../app/providers/registry';

/*
 * Every app says what universal search may hold from it. What is not classified is excluded by default: an app with no
 * explicit entry is not searched at all, and the search sheet itself carries no app's records.
 */
describe('search classification', () => {
  it('every app, retired ones too, has an explicit entry', () => {
    for (const app of APPS) expect(app.search, app.id).toBeDefined();
  });
  it('an app searched through a provider is own-search and lists what it indexes and what it never does', () => {
    for (const app of APPS.filter((each) => each.provides?.includes('search'))) {
      expect(app.search?.privacy, app.id).toBe('own-search');
      expect(app.search?.indexes.length, app.id).toBeGreaterThan(0);
      expect(app.search?.excludes.length, app.id).toBeGreaterThan(0);
      expect(Object.keys(providerModules), app.id).toContain(app.id);
    }
  });
  it('a private app is not searched: no fields, no search provider', () => {
    const privateApps = APPS.filter((app) => app.search?.privacy === 'private').map((app) => app.id);
    expect(privateApps.sort()).toEqual(['diaita', 'mneme', 'melete', 'phyton', 'praxis'].sort());
    for (const id of privateApps) {
      expect(APPS.find((app) => app.id === id)?.search?.indexes, id).toEqual([]);
      expect(APPS.find((app) => app.id === id)?.provides ?? [], id).not.toContain('search');
    }
  });
  it('the decided exclusions are in the manifest', () => {
    const excludes = (id: string) => APPS.find((app) => app.id === id)?.search?.excludes ?? [];
    expect(excludes('therapeia')).toEqual(expect.arrayContaining(['medication doses', 'visit notes', 'questions for the doctor']));
    expect(excludes('ktema')).toContain('serial numbers');
    expect(excludes('poreia')).toContain('confirmation codes');
    expect(excludes('ergon')).toContain('chore note');
  });
  it('the search sheet holds no other app’s records, only the providers do', () => {
    const sheet = readFileSync('src/features/search/SearchSheet.tsx', 'utf8');
    expect(sheet).not.toMatch(/from '\.\.\/\.\.\/(askesis|soma|oikonomia|hydros|poreia|theoria|diaita|philia|ergon|therapeia|dynamis|ktema|phyton|mneme|melete)\//);
    expect(sheet).not.toMatch(/isAdded\(/);
    expect(sheet).not.toMatch(/kind: 'app'/);
  });
});
