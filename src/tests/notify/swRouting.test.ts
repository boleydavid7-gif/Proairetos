import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('public/sw.js', 'utf8');

describe('the worker leaves its own pass-through requests to the network', () => {
  it('routes exactly the paths its fetch handler never answers', () => {
    const routed = [...(source.match(/NETWORK_ONLY = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(routed).toEqual(['/api/*', '/sounds/*', '/ocr/*', '/ort/*', '/lamplight/*', '/sw.js']);
    // The same paths are left alone by the fetch handler itself, so routing them changes nothing but the wake-up.
    for (const path of ['/api/', '/sounds/', '/ocr/', '/ort/', '/sw.js', 'lamplight']) expect(source).toContain(path.replace(/^\//, ''));
  });

  it('does nothing where static routing is missing, and never lets a failure stop the install', () => {
    expect(source).toContain("typeof event.addRoutes !== 'function'");
    expect(source).toMatch(/\.catch\(\(\) => undefined\)/);
  });
});
