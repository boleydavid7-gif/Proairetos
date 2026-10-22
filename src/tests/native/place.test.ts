import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nativeId, placeFor } from '../../core/notify/place';

describe('where a notice leads', () => {
  it('follows the service worker’s rules exactly', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    const body = sw.slice(sw.indexOf('function placeFor(open) {'), sw.indexOf('\n}\n', sw.indexOf('function placeFor(open) {')) + 2);
    const swPlaceFor = new Function(`${body}; return placeFor;`)() as typeof placeFor;
    for (const open of ['today', 'item:abc', 'hydros', 'praxis', 'askesis', 'oikonomia:bill:1', 'therapeia:medicine:m1', 'ergon', 'poreia:trip:t', 'reflect'])
      expect(placeFor(open)).toEqual(swPlaceFor(open));
  });

  it('gives each key one steady positive number', () => {
    expect(nativeId('therapeia:dose:1')).toBe(nativeId('therapeia:dose:1'));
    expect(nativeId('a')).not.toBe(nativeId('b'));
    for (const key of ['x', 'item:1:2026-10-22T09:00', '']) {
      expect(nativeId(key)).toBeGreaterThan(0);
      expect(nativeId(key)).toBeLessThan(2 ** 31);
    }
  });
});
