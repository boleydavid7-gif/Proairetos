import { describe, expect, it } from 'vitest';
import { askOverpass, handleTravelNear } from '../../../worker/travelNear';

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('places near a trip through the site', () => {
  it('takes the first useful answer when the main server is busy', async () => {
    const asked: string[] = [];
    const fetchImpl = (async (url: string) => {
      asked.push(url);
      if (url.includes('overpass-api.de')) return answer({}, 429);
      return answer({ elements: [{ type: 'node', id: 1, lat: 1, lon: 2, tags: { name: 'A' } }] });
    }) as unknown as typeof fetch;
    const data = await askOverpass('q', fetchImpl, 1);
    expect(data.elements).toHaveLength(1);
    expect(asked[0]).toContain('overpass-api.de');
  });

  it('treats a timed-out answer with a remark as no answer', async () => {
    const fetchImpl = (async () => answer({ elements: [], remark: 'runtime error: timeout' })) as unknown as typeof fetch;
    await expect(askOverpass('q', fetchImpl, 1)).rejects.toBeTruthy();
  });

  it('checks the kind and place before asking', async () => {
    const response = await handleTravelNear(new Request('https://proairetos.com/api/travel/near?category=nope&lat=1&lon=2'));
    expect(response.status).toBe(400);
  });

  it('passes the places on', async () => {
    const fetchImpl = (async () => answer({ elements: [{ type: 'node', id: 7, lat: 38.7, lon: -9.1, tags: { name: 'Café' } }] })) as unknown as typeof fetch;
    const response = await handleTravelNear(new Request('https://proairetos.com/api/travel/near?category=coffee&lat=38.71&lon=-9.13', { headers: { 'cf-connecting-ip': 'near-test' } }), fetchImpl);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { elements: unknown[] }).elements).toHaveLength(1);
  });
});
