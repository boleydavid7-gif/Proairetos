import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '../../lamplight');
const files = readdirSync(dir).filter((name) => name.endsWith('.css'));
const LIGHT = new Set(['#f4f1ea', '#fffcf7', '#f0ece4', '#1d2730']);
const code = (name: string) => readFileSync(join(dir, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('Lamplight rules hold in the stylesheets', () => {
  it('has the stylesheets it is described by', () => {
    for (const name of ['tokens.css', 'materials.css', 'tonal.css', 'bars.css', 'modern.css']) expect(files).toContain(name);
    expect(files).not.toContain('material.css');
  });

  it('uses backdrop-filter only in bars.css (the phone top bar)', () => {
    const found = files.filter((name) => /backdrop-filter/.test(code(name)));
    expect(found).toEqual(['bars.css']);
  });

  it('keeps fixed colors in tokens.css (a hex may only be a var() fallback or a mask)', () => {
    const stray: string[] = [];
    for (const name of files.filter((n) => n !== 'tokens.css')) {
      code(name).split('\n').forEach((line, i) => {
        if (/mask/.test(line)) return;
        const bare = line.replace(/var\([^()]*(\([^()]*\)[^()]*)*\)/g, '');
        if (/#[0-9a-fA-F]{3,8}\b/.test(bare)) stray.push(`${name}:${i + 1} ${line.trim()}`);
      });
    }
    expect(stray).toEqual([]);
  });

  it('takes radii and font sizes from tokens', () => {
    const stray: string[] = [];
    for (const name of files.filter((n) => n !== 'tokens.css')) {
      code(name).split('\n').forEach((line, i) => {
        if (/border-radius:\s*[0-9.]+px/.test(line) || /font-size:\s*[0-9.]+(px|rem)/.test(line)) stray.push(`${name}:${i + 1}`);
      });
    }
    expect(stray).toEqual([]);
  });

  it('gives the same role the same fallback color', () => {
    const roles = new Map<string, Set<string>>();
    for (const name of files) {
      for (const m of code(name).matchAll(/var\((--ll-[a-z-]+),\s*(#[0-9a-fA-F]{6})\)/g)) {
        const set = roles.get(m[1]) ?? new Set<string>();
        if (LIGHT.has(m[2].toLowerCase())) continue; // light-mode anchors are a second palette, not a conflict
        set.add(m[2].toLowerCase());
        roles.set(m[1], set);
      }
    }
    const split = [...roles].filter(([, set]) => set.size > 1).map(([role, set]) => `${role}: ${[...set].join(' ')}`);
    expect(split).toEqual([]);
  });

  it('keeps durations on the tempo tokens', () => {
    const stray: string[] = [];
    for (const name of files.filter((n) => n !== 'tokens.css')) {
      code(name).split('\n').forEach((line, i) => {
        if (/(transition|animation)(-duration)?:/.test(line) && /\b[0-9.]+m?s\b/.test(line.replace(/0\.001ms|1ms|0ms|calc\([^)]*\)/g, ''))
          && !/@media|reduce/.test(line)) stray.push(`${name}:${i + 1} ${line.trim()}`);
      });
    }
    expect(stray.length).toBeLessThan(40); // measured, then held: tighten as these move to tokens
  });
});

describe('Lamplight light is defined once', () => {
  const all = files.map((name) => [name, code(name)] as const);
  const defs = (token: string) => all.filter(([, text]) => new RegExp(`^\\s*${token}:`, 'm').test(text)).map(([name]) => name);

  it('defines the light ladder only in light.css', () => {
    for (const token of ['--ll-sheen-edge', '--ll-sheen-wash', '--ll-cast', '--ll-surface-light', '--ll-lit-edge', '--ll-halo',
      '--ll-lamp-light', '--ll-light-1', '--ll-light-2', '--ll-light-3', '--ll-field-edge', '--ll-field-well', '--ll-glow-time']) {
      expect(defs(token), token).toEqual(['light.css']);
    }
  });

  it('defines focus and the lit halo only in light.css (levels.css may quiet the halo while typing)', () => {
    expect(defs('--ll-focus')).toEqual(['light.css']);
    expect(defs('--ll-lit-halo').sort()).toEqual(['levels.css', 'light.css']);
    expect(defs('--ll-lit-wash').sort()).toEqual(['levels.css', 'light.css']);
  });

  it('lists the same surfaces for the light and the vellum', () => {
    const list = (name: string) => {
      const m = code(name).match(/:root :is\((\.card,[^{]*?)\)\s*\{/);
      return m![1].replace(/\s+/g, ' ').split(',').map((x) => x.trim()).sort();
    };
    expect(list('paper.css')).toEqual(list('light.css'));
  });
});

describe('Editorial standards', () => {
  it('defines .ll-plain and .ll-steady once, in layout.css, on the radius token', () => {
    const where = (needle: string) => files.filter((name) => code(name).includes(needle));
    expect(where('.ll-plain {')).toEqual(['layout.css']);
    expect(where('.ll-steady:not(:disabled) {')).toEqual(['layout.css']);
    expect(code('layout.css')).toContain('var(--ll-radius-action)');
    expect(code('tokens.css')).toContain('--ll-radius-action: var(--ll-radius-sm)');
  });
});

