import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APPS, checkAssets, type Files } from '../../core/apps';

const root = process.cwd();
const disk: Files = {
  exists: (p) => existsSync(join(root, p)),
  list: (p) => (existsSync(join(root, p)) ? readdirSync(join(root, p)) : []),
  readJson: (p) => {
    try {
      return JSON.parse(readFileSync(join(root, p), 'utf8'));
    } catch {
      return undefined;
    }
  },
};

describe('application assets', () => {
  it('has every required runtime file', () => {
    expect(checkAssets(disk).errors).toEqual([]);
  });
  it('reports a missing runtime file as an error and a missing optional one as a warning', () => {
    const without = (needle: string): Files => ({ ...disk, exists: (p) => !p.includes(needle) && disk.exists(p) });
    expect(checkAssets(without('ktema/sw.js'), APPS).errors.join('\n')).toContain('ktema');
    const optional = checkAssets(without('ktema/icons/apple-touch-icon.png'), APPS);
    expect(optional.errors).toEqual([]);
    expect(optional.warnings.join('\n')).toContain('apple-touch-icon');
  });
});
