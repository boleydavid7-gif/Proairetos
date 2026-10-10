import { describe, expect, it } from 'vitest';
import { appAt, sourceOf, sourcesToWrite, wordsOf } from '../../core/notify/sources';
import { openNoticeWords, sealNoticeWords } from '../../data/sync/keys';
import { findJudgmentLanguage } from '../../core/rules/languageRules';
import { readFileSync } from 'node:fs';

describe('reminders from every app', () => {
  it('belong to the app they come from', () => {
    expect(sourceOf({ kind: 'item' })).toBe('proairetos');
    expect(sourceOf({ kind: 'bell' })).toBe('proairetos');
    expect(sourceOf({ kind: 'run' })).toBe('askesis');
    expect(sourceOf({ kind: 'bill' })).toBe('oikonomia');
    expect(sourceOf({ kind: 'hydration' })).toBe('hydros');
    expect(sourceOf({ kind: 'study' })).toBe('praxis');
  });

  it('knows which app a page is', () => {
    expect(appAt('/')).toBe('proairetos');
    expect(appAt('/hydros/')).toBe('hydros');
    expect(appAt('/oikonomia/index.html')).toBe('oikonomia');
    expect(appAt('/theoria/')).toBe('theoria');
    expect(appAt('/settings')).toBe('proairetos');
  });

  it('lets each app write only its own, so none removes another', () => {
    expect(sourcesToWrite('hydros', [{ kind: 'item' }, { kind: 'hydration' }])).toEqual(['hydros']);
    expect(sourcesToWrite('praxis', [])).toEqual(['praxis']);
    expect(sourcesToWrite('oikonomia', [{ kind: 'bill' }])).toEqual(['oikonomia']);
    expect(sourcesToWrite('soma', [{ kind: 'item' }])).toEqual([]);
    expect(sourcesToWrite('theoria', [])).toEqual([]);
  });

  it('has Proairetos keep the others current when it holds their data, never the running study block', () => {
    expect(sourcesToWrite('proairetos', [{ kind: 'item' }])).toEqual(['proairetos']);
    expect(sourcesToWrite('proairetos', [{ kind: 'bill' }, { kind: 'run' }, { kind: 'study' }])).toEqual(['proairetos', 'askesis', 'oikonomia']);
    // The last bill removed: written before, so its rows are cleared.
    expect(sourcesToWrite('proairetos', [], ['oikonomia'])).toEqual(['proairetos', 'oikonomia']);
  });

  it('seals the words so only the account key opens them, in a form the service worker reads', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const words = wordsOf({ key: 'water:1', title: 'Water', body: 'Last drink logged at 2:10 PM.', open: 'hydros' });
    const sealed = await sealNoticeWords(key, words);
    expect(sealed).not.toContain('Water');
    expect(sealed.length).toBeLessThanOrEqual(1200);
    expect(await openNoticeWords(key, sealed)).toEqual(words);

    // The same steps public/sw.js takes.
    const bytes = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode('proairetos-notice') },
      key,
      bytes.slice(12),
    );
    expect(JSON.parse(new TextDecoder().decode(plain))).toEqual(words);
  });

  it('keeps the longest words under the server limit', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const long = 'x'.repeat(2000);
    const sealed = await sealNoticeWords(key, wordsOf({ key: long, title: long, body: long, open: long }));
    expect(sealed.length).toBeLessThanOrEqual(1200);
  });

  it('opens the sealed words in the worker and uses each app’s mark', () => {
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(worker).toContain("'proairetos-notice'");
    expect(worker).toContain("get('dataKey')");
    expect(findJudgmentLanguage(worker)).toEqual([]);
  });
});
