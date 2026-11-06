import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIAG_APPS, diagFiles } from '../../core/apps';

/* The storage diagnostic (temporary). Its pages are generated; nothing in production code reads or depends on it. */
describe('the storage diagnostic', () => {
  it('its generated pages are current', () => {
    for (const [file, text] of Object.entries(diagFiles())) expect(readFileSync(file, 'utf8'), file).toBe(text);
  });
  it('covers Hydros, Soma and Meletē, each in a scope no app worker covers', () => {
    expect([...DIAG_APPS]).toEqual(['hydros', 'soma', 'melete']);
    for (const id of DIAG_APPS) {
      const manifest = JSON.parse(diagFiles()[`public/lab/diag/${id}/manifest.webmanifest`]) as { scope: string; start_url: string };
      expect(manifest.scope).toBe(`/lab/diag/${id}/`);
      expect(manifest.start_url).toBe(manifest.scope);
    }
  });
  it('the main worker already leaves /lab/ alone, so it never caches the diagnostic', () => {
    expect(readFileSync('public/sw.js', 'utf8')).toContain('/^\\/(lamplight|lab)(\\/|$)/');
  });
  it('only ever touches its own names', () => {
    const script = readFileSync('public/lab/diag/diag.js', 'utf8');
    expect(script).not.toMatch(/localStorage\.clear|indexedDB\.databases|caches\.delete\((?!name)/);
    expect(script).toContain("name.startsWith('proairetos-diag-')");
    expect(script).toContain("startsWith(KEY)");
    expect(script).not.toMatch(/fetch\(|XMLHttpRequest|supabase|\/api\//);
  });
});
