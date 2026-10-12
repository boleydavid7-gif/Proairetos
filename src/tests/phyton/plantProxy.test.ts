import { beforeEach, describe, expect, it } from 'vitest';
import { handlePlantRequest, readMatches } from '../../../worker/plantProxy';
import { resetRateLimit } from '../../../worker/safeFetch';

const photo = (type = 'image/jpeg', size = 1000) => new File([new Uint8Array(size)], 'p.jpg', { type });

function ask(images: File[], organs: string[] = [], origin = 'https://proairetos.com') {
  const form = new FormData();
  images.forEach((image) => form.append('images', image));
  organs.forEach((organ) => form.append('organs', organ));
  return new Request('https://proairetos.com/api/plant', { method: 'POST', body: form, headers: { origin } });
}

describe('the plant bridge', () => {
  beforeEach(() => resetRateLimit());

  it('passes photos and organs to Pl@ntNet with the key and returns plain matches', async () => {
    let sent: { url: string; organs: string[]; images: number } | undefined;
    const fake = (async (url: string, init: RequestInit) => {
      const body = init.body as FormData;
      sent = { url, organs: body.getAll('organs').map(String), images: body.getAll('images').length };
      return new Response(JSON.stringify({ results: [{ score: 0.91234, species: { scientificNameWithoutAuthor: 'Epipremnum aureum', genus: { scientificNameWithoutAuthor: 'Epipremnum' }, family: { scientificNameWithoutAuthor: 'Araceae' }, commonNames: ['Golden pothos'] } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const reply = await handlePlantRequest(ask([photo(), photo('image/png')], ['leaf', 'nonsense']), 'KEY', fake);
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual({ matches: [{ score: 0.912, latin: 'Epipremnum aureum', genus: 'Epipremnum', family: 'Araceae', common: ['Golden pothos'] }] });
    expect(sent!.url).toContain('api-key=KEY');
    expect(sent!.organs).toEqual(['leaf', 'auto']);
    expect(sent!.images).toBe(2);
  });

  it('refuses without a key, from another site, too many photos or the wrong kind', async () => {
    expect((await handlePlantRequest(ask([photo()]), undefined)).status).toBe(503);
    expect((await handlePlantRequest(ask([photo()], [], 'https://elsewhere.example'), 'KEY')).status).toBe(403);
    expect((await handlePlantRequest(ask([photo(), photo(), photo(), photo()]), 'KEY')).status).toBe(400);
    expect((await handlePlantRequest(ask([photo('image/gif')]), 'KEY')).status).toBe(400);
    expect((await handlePlantRequest(new Request('https://proairetos.com/api/plant'), 'KEY')).status).toBe(405);
  });

  it('reads no match as an empty list', async () => {
    const reply = await handlePlantRequest(ask([photo()]), 'KEY', (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch);
    expect(await reply.json()).toEqual({ matches: [] });
    expect(readMatches({ results: [{ score: 0.1 }] })).toEqual([]);
  });
});
