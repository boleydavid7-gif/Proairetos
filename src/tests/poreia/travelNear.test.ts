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

describe('places from Nominatim when Overpass is down', () => {
  it('reads its answers in Overpass shape and leaves other things out', async () => {
    const { fromNominatim } = await import('../../../worker/travelNear');
    const elements = fromNominatim([
      { osm_type: 'node', osm_id: 1, lat: '38.71', lon: '-9.14', category: 'amenity', type: 'cafe', name: 'A Brasileira', extratags: { opening_hours: 'Mo-Su 08:00-02:00' }, address: { road: 'Rua Garrett', house_number: '120' } },
      { osm_type: 'way', osm_id: 2, lat: '38.7', lon: '-9.1', category: 'landuse', type: 'construction', name: 'Site' },
    ]);
    expect(elements).toHaveLength(1);
    expect(elements[0].tags).toMatchObject({ name: 'A Brasileira', amenity: 'cafe', opening_hours: 'Mo-Su 08:00-02:00', 'addr:street': 'Rua Garrett' });
  });

  it('asks each phrase within a box around the place', async () => {
    const { askNominatim } = await import('../../../worker/travelNear');
    const asked: string[] = [];
    const fetchImpl = (async (url: string) => {
      asked.push(decodeURIComponent(new URL(url).searchParams.get('q') ?? ''));
      return answer([{ osm_type: 'node', osm_id: asked.length, lat: '38.71', lon: '-9.14', category: 'amenity', type: 'cafe', name: `Café ${asked.length}` }]);
    }) as unknown as typeof fetch;
    const data = await askNominatim('coffee', 38.717, -9.133, fetchImpl, 0);
    expect(asked).toEqual(['[cafe]', '[bakery]', '[ice cream]']);
    expect(data.elements).toHaveLength(3);
  });
});
