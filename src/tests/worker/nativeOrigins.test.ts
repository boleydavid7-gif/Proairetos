import { describe, expect, it } from 'vitest';
import worker from '../../../worker/index';

const env = { ASSETS: { fetch: async () => new Response('page') } } as never;
const ask = (path: string, origin?: string, method = 'GET') =>
  worker.fetch(new Request(`https://proairetos.com${path}`, { method, headers: origin ? { origin } : {} }), env);

describe('the phone app asking the Worker', () => {
  it('answers a preflight from the app on any /api route', async () => {
    const answer = await ask('/api/storage', 'capacitor://localhost', 'OPTIONS');
    expect(answer.status).toBe(204);
    expect(answer.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
    expect(answer.headers.get('access-control-allow-headers')).toMatch(/authorization/);
  });

  it('lets the app through the same-origin checks, and keeps other websites out', async () => {
    const fromApp = await ask('/api/storage', 'https://localhost');
    expect(fromApp.status).not.toBe(403);
    expect(fromApp.headers.get('access-control-allow-origin')).toBe('https://localhost');
    const fromElsewhere = await ask('/api/storage', 'https://example.com');
    expect(fromElsewhere.status).toBe(403);
    expect(fromElsewhere.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('leaves the website as it was', async () => {
    const fromSite = await ask('/api/storage', 'https://proairetos.com');
    expect(fromSite.status).not.toBe(403);
    expect(fromSite.headers.get('access-control-allow-origin')).toBeNull();
    expect(await (await ask('/today')).text()).toBe('page');
  });
});
