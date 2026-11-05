import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';

/*
 * Wave 0: the manifest must agree with every list still written out by hand. As each consumer moves to read the
 * manifest, its test here changes from "equal to the old list" to "derived from the manifest".
 */
const read = (p: string) => readFileSync(p, 'utf8');
const list = (text: string, pattern: RegExp): string[] => {
  const m = pattern.exec(text);
  if (!m) throw new Error(`no match for ${pattern}`);
  return [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
};
const same = (a: readonly string[], b: readonly string[]) => expect([...a].sort()).toEqual([...b].sort());
const ids = (pick: (a: (typeof APPS)[number]) => boolean) => APPS.filter(pick).map((a) => a.id);

describe('manifest parity with the lists written by hand', () => {
  it('ADD_ONS', () => {
    same(list(read('src/app/family/added.ts'), /ADD_ONS[^=]*=\s*\[([^\]]*)\]/), ids((a) => a.status !== 'main'));
  });
  it('NOT_OFFERED', () => {
    same(list(read('src/app/family/added.ts'), /NOT_OFFERED[^=]*=\s*new Set<AddOn>\(\[([^\]]*)\]/), ids((a) => a.status === 'retired'));
  });
  it('CORE_APPS', () => {
    same(list(read('src/app/family/purchases.ts'), /CORE_APPS\s*=\s*\[([^\]]*)\]/), ids((a) => a.install.coreBundle));
  });
  it('the backup prefixes', () => {
    const prefixes = [...read('src/data/backup/family.ts').match(/PREFIXES = \[([^\]]*)\]/)![1].matchAll(/'([a-z.]+)[:.]'/g)].map((x) => x[1]);
    same(prefixes, APPS.filter((a) => a.id === 'proairetos' || a.data.backupPrefix).map((a) => (a.id === 'proairetos' ? 'proairetos' : a.data.backupPrefix!.replace(/[:.]$/, ''))));
  });
  it('the apps sync knows by name', () => {
    same(list(read('src/data/sync/supabase.ts'), /knownApps = \[([^\]]*)\]/), ids((a) => a.status !== 'main'));
  });
  it('REMINDER_SOURCES', () => {
    same(list(read('src/core/notify/sources.ts'), /REMINDER_SOURCES[^=]*=\s*\[([^\]]*)\]/), APPS.filter((a) => a.id === 'proairetos' || a.notices.source).map((a) => a.notices.source ?? a.id));
  });
  it('the Vite entry points', () => {
    const text = read('vite.config.ts');
    const entries = [...text.matchAll(/(\w+): '(?:[\w/]+\/)?index\.html'/g)].map((m) => m[1]);
    for (const a of APPS) expect(entries, a.id).toContain(a.id === 'proairetos' ? 'main' : a.id);
  });
  it('each retired app is still listed where its records and links must keep working', () => {
    expect(read('src/data/sync/supabase.ts')).toContain("'praxis'");
    expect(read('src/app/family/added.ts')).toContain("'praxis'");
  });
});
