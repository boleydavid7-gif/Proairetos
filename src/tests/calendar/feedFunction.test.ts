import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { describe, expect, it } from 'vitest';

/*
 * The calendar-feed function's own code, run here with a stand-in for the database client that applies the filters the
 * function asks for (`token`, `format`) the way the database does. It holds the function to what it must do with a row
 * made before the privacy correction (no format): never serve it, whatever the token. Not run on Supabase.
 */
type Row = { token: string; ics: string; format: number | null };
async function load(rows: Row[], failing = false) {
  const source = readFileSync('supabase/functions/calendar-feed/index.ts', 'utf8').replace(/^import .*createClient.*$/m, 'const createClient = globalThis.__createClient;');
  const { code } = await transform(source, { loader: 'ts' });
  let handler: (request: Request) => Promise<Response> = async () => new Response('no handler');
  const env: Record<string, string> = { SUPABASE_URL: 'http://stand-in.test', SUPABASE_SERVICE_ROLE_KEY: 'x' };
  const queries: { filters: Record<string, unknown> }[] = [];
  const client = {
    from: () => {
      const filters: Record<string, unknown> = {};
      queries.push({ filters });
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => { filters[column] = value; return builder; },
        maybeSingle: async () => {
          if (failing) return { data: null, error: { message: 'down' } };
          const found = rows.find((row) => Object.entries(filters).every(([column, value]) => (row as unknown as Record<string, unknown>)[column] === value));
          return { data: found ? { ics: found.ics } : null, error: null };
        },
      };
      return builder;
    },
  };
  (globalThis as Record<string, unknown>).__createClient = () => client;
  (globalThis as Record<string, unknown>).Deno = { env: { get: (name: string) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } };
  new Function(code)();
  return { call: (path: string, init?: RequestInit) => handler(new Request(`https://stand-in.test/functions/v1/calendar-feed${path}`, init)), queries };
}
const OLD = 'o'.repeat(43);
const NEW = 'n'.repeat(43);
const rows: Row[] = [{ token: OLD, ics: 'SUMMARY:Internet · $78.24 Confirmation ABC123', format: null }, { token: NEW, ics: 'BEGIN:VCALENDAR\r\nSUMMARY:Busy\r\nEND:VCALENDAR', format: 2 }];

describe('the calendar-feed function', () => {
  it('does not serve a file made before the correction, whichever way the token is given', async () => {
    const { call } = await load(rows);
    for (const path of [`?token=${OLD}`, `/${OLD}`, `/${OLD}.ics`]) {
      const response = await call(path);
      expect(response.status, path).toBe(404);
      expect(await response.text()).not.toMatch(/ABC123|Internet/);
    }
  });
  it('serves a format 2 file with the headers it always had and a no-referrer policy', async () => {
    const { call } = await load(rows);
    const response = await call(`?token=${NEW}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('SUMMARY:Busy');
    expect(response.headers.get('content-type')).toMatch(/text\/calendar/);
    expect(response.headers.get('cache-control')).toBe('private, max-age=900');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect((await call(`/${NEW}.ics`, { method: 'HEAD' })).status).toBe(200);
  });
  it('always asks for format 2, and rejects a malformed token, an unknown token and other methods without asking the database', async () => {
    const { call, queries } = await load(rows);
    await call(`?token=${NEW}`);
    expect(queries.at(-1)?.filters).toEqual({ token: NEW, format: 2 });
    const before = queries.length;
    expect((await call('?token=short')).status).toBe(404);
    expect((await call(`?token=${NEW}`, { method: 'POST' })).status).toBe(405);
    expect(queries.length).toBe(before);
    expect((await call(`?token=${'z'.repeat(43)}`)).status).toBe(404);
  });
  it('says to try later when the database is down, and writes nothing to any log', async () => {
    const lines: unknown[][] = [];
    const original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
    console.log = console.info = console.warn = console.error = (...args: unknown[]) => { lines.push(args); };
    try {
      const { call } = await load(rows, true);
      expect((await call(`?token=${NEW}`)).status).toBe(503);
      await call(`?token=${OLD}`);
    } finally {
      Object.assign(console, original);
    }
    expect(lines).toEqual([]);
  });
});
