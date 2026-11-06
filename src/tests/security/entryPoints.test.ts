import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Every app must open behind the same lock. They all mount through the shared error boundary (directly, or through
 * `startApp`), and the error boundary mounts the security gate. This fails if an app is added that skips either.
 */
const src = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(src, path), 'utf8');

const entries = readdirSync(src)
  .map((name) => `${name}/main.tsx`)
  .filter((path) => existsSync(join(src, path)))
  // The design guide shows no one's records; Praxis only forwards to Theoria.
  .filter((path) => !['lamplight-guide/main.tsx', 'praxis/main.tsx'].includes(path))
  .concat('main.tsx');

describe('every app opens behind the security gate', () => {
  it('finds the apps', () => {
    expect(entries.length).toBeGreaterThanOrEqual(16);
  });

  it.each(entries)('%s mounts through the shared error boundary', (path) => {
    const text = read(path);
    expect(/ErrorBoundary/.test(text) || /startApp\(/.test(text), `${path} neither uses ErrorBoundary nor startApp`).toBe(true);
  });

  it('startApp mounts the shared error boundary', () => {
    expect(read('app/family/startApp.tsx')).toMatch(/<ErrorBoundary>/);
  });

  it('the error boundary mounts the security gate around every app', () => {
    expect(read('app/ErrorBoundary.tsx')).toMatch(/<SecurityGate>\{this\.props\.children\}<\/SecurityGate>/);
  });

  it('the sync controller, which every app starts, starts the security service when a vault exists', () => {
    expect(read('app/sync/syncController.ts')).toMatch(/vaultExistsHere\(\)\) void security\.start\(\)/);
  });
});
