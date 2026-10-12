import { tooOften } from './safeFetch';

/**
 * Identifies a plant from photos for Phyton through Pl@ntNet (my-api.plantnet.org), keeping the key on the
 * server (the secret PLANTNET_KEY). Only the photos and which part of the plant each shows are passed on;
 * nothing is stored or logged here. Pl@ntNet's free plan is for non-commercial use, 500 identifications a day.
 */
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 2_000_000;
const ORGANS = new Set(['auto', 'leaf', 'flower', 'fruit', 'bark']);

export type PlantMatch = { score: number; latin: string; genus?: string; family?: string; common: string[] };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

type Upstream = {
  results?: { score?: number; species?: { scientificNameWithoutAuthor?: string; genus?: { scientificNameWithoutAuthor?: string }; family?: { scientificNameWithoutAuthor?: string }; commonNames?: string[] } }[];
};

/** Pl@ntNet's answer, reduced to what Phyton shows. */
export function readMatches(data: Upstream): PlantMatch[] {
  return (data.results ?? [])
    .filter((result) => result.species?.scientificNameWithoutAuthor)
    .slice(0, 5)
    .map((result) => ({
      score: Math.round((result.score ?? 0) * 1000) / 1000,
      latin: result.species!.scientificNameWithoutAuthor!,
      genus: result.species!.genus?.scientificNameWithoutAuthor,
      family: result.species!.family?.scientificNameWithoutAuthor,
      common: (result.species!.commonNames ?? []).slice(0, 4),
    }));
}

export async function handlePlantRequest(request: Request, key: string | undefined, fetchImpl: typeof fetch = fetch, lang = 'en'): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { error: 'Not allowed' });
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return reply(403, { error: 'Not allowed' });
  if (!key) return reply(503, { error: 'Identifying plants is not set up yet.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_PHOTOS * MAX_PHOTO_BYTES + 10_000) return reply(413, { error: 'Those photos are too large.' });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { error: 'No photo came through.' });
  }
  const images = form.getAll('images').filter((each): each is File => typeof each !== 'string');
  const organs = form.getAll('organs').map(String);
  if (!images.length || images.length > MAX_PHOTOS) return reply(400, { error: `Send one to ${MAX_PHOTOS} photos.` });
  if (images.some((image) => image.size > MAX_PHOTO_BYTES || !/^image\/(jpeg|png|webp)$/.test(image.type))) return reply(400, { error: 'Photos need to be JPEG, PNG or WebP, under 2 MB.' });
  const out = new FormData();
  images.forEach((image, index) => {
    out.append('images', image, `photo-${index + 1}.${image.type.split('/')[1]}`);
    out.append('organs', ORGANS.has(organs[index]) ? organs[index] : 'auto');
  });
  const params = new URLSearchParams({ 'api-key': key, 'nb-results': '5', lang: /^[a-z]{2}$/.test(lang) ? lang : 'en', 'include-related-images': 'false' });
  let upstream: Response;
  try {
    upstream = await fetchImpl(`https://my-api.plantnet.org/v2/identify/all?${params}`, { method: 'POST', body: out, signal: AbortSignal.timeout(20_000) });
  } catch {
    return reply(502, { error: 'Pl@ntNet could not be reached. Try again later.' });
  }
  // Pl@ntNet answers 404 when no species matches.
  if (upstream.status === 404) return reply(200, { matches: [] });
  if (upstream.status === 429) return reply(429, { error: 'Today’s identifications are used up. Try again tomorrow.' });
  if (!upstream.ok) return reply(502, { error: `Pl@ntNet answered with ${upstream.status}.` });
  try {
    return reply(200, { matches: readMatches((await upstream.json()) as Upstream) });
  } catch {
    return reply(502, { error: 'Pl@ntNet’s answer could not be read.' });
  }
}
