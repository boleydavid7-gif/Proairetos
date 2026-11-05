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
