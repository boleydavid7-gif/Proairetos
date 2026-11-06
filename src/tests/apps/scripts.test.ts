import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';

/*
 * Wave 3. The development scripts read the manifest (`surfaces.*`, names, colors, front page identity). These tests hold
 * the sets they cover to what the hand-written lists covered, and keep the old lists from creeping back.
 */
const ids = (flag: keyof (typeof APPS)[number]['surfaces']) => APPS.filter((app) => app.surfaces[flag]).map((app) => app.id).sort();
const twelve = ['askesis', 'soma', 'oikonomia', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia'];

describe('the checks cover the same apps as before', () => {
  it('speed', () => {
    expect(ids('speed')).toEqual(['proairetos', ...twelve.filter((id) => id !== 'poreia'), 'poreia', 'mneme', 'melete'].sort());
  });
  it('layout and visual', () => {
    expect(ids('layout')).toEqual(['proairetos', ...twelve].sort());
    expect(ids('visual')).toEqual(['proairetos', ...twelve].sort());
  });
  it('smoke keeps Hydros and the retired Praxis', () => {
    expect(ids('smoke')).toEqual(['proairetos', ...twelve, 'hydros', 'praxis'].sort());
  });
  it('alone', () => {
    expect(ids('alone')).toEqual(twelve.filter((id) => id !== 'poreia').sort());
  });
  it('a retired app is only ever in the smoke check, which opens its forwarding page', () => {
    for (const app of APPS.filter((each) => each.status === 'retired')) {
      const on = Object.entries(app.surfaces).filter(([, value]) => value).map(([flag]) => flag);
      expect(on.filter((flag) => flag !== 'smoke' && flag !== 'noticeWindow' && flag !== 'waitlist' && flag !== 'prefetch'), app.id).toEqual([]);
    }
  });
});

describe('the scripts read the manifest', () => {
  const read = (path: string) => readFileSync(path, 'utf8');
  it('no script keeps its own list of apps', () => {
    for (const file of ['scripts/speed-check/check.mjs', 'scripts/layout-check/check.mjs', 'scripts/visual-check/shoot.mjs', 'scripts/visual/smoke.mjs', 'scripts/family-check/alone.mjs']) {
      const text = read(file);
      expect(text, file).toContain("surfaceIds('");
      expect(text, file).not.toMatch(/'ergon', 'therapeia'/);
    }
  });
  it('the front pages take their identity from the manifest and only their own words from the script', () => {
    const text = read('scripts/welcome/build.mjs');
    expect(text).toContain('loadRegistry');
    const content = text.slice(text.indexOf('const content = ['), text.indexOf('// Proairetos has no colors'));
    const pages = [...content.matchAll(/^ {4}id: '(\w+)'/gm)].map((m) => m[1]);
    expect(pages.length).toBeGreaterThan(10);
    const live = new Set(APPS.filter((app) => app.status !== 'retired').map((app) => app.id));
    for (const id of pages) expect(live.has(id as never), id).toBe(true);
    expect(content).not.toMatch(/\bname: '/);
    expect(content).not.toMatch(/\bicon: '/);
  });
});
