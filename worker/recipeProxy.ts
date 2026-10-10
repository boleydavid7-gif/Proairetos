import { blockedHost, fetchChecked, readCapped, tooOften } from './safeFetch';

/**
 * Reads a recipe page for SOMA. Most recipe sites carry the recipe in a
 * standard structured form (schema.org Recipe, as JSON-LD) inside the page;
 * this fetches the page and hands back only those blocks, with the page's
 * title and picture as a fallback. It stores nothing and logs nothing.
 */
export const MAX_PAGE_BYTES = 4_000_000;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

const meta = (html: string, name: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))?.[1];

/** The JSON-LD blocks in a page. */
export function jsonLdBlocks(html: string): string[] {
  const out: string[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) out.push(match[1]);
  return out;
}

export async function handleRecipeRequest(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
  const raw = new URL(request.url).searchParams.get('url') ?? '';
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return reply(400, { error: 'That does not look like a web address.' });
  }
  if (!/^https?:$/.test(target.protocol) || blockedHost(target.hostname)) return reply(400, { error: 'Only web addresses can be read.' });
  let upstream: Response;
  let finalUrl = target.toString();
  try {
    const result = await fetchChecked(
      target,
      {
        headers: { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'user-agent': 'Mozilla/5.0 (compatible; SOMA recipe reader; +https://proairetos.com)' },
        signal: AbortSignal.timeout(15_000),
      },
      (next) => /^https?:$/.test(next.protocol),
      fetchImpl,
    );
    if ('refused' in result) return reply(400, { error: 'Only web addresses can be read.' });
    upstream = result.response;
    finalUrl = result.url;
  } catch {
    return reply(502, { error: 'The page could not be reached. Try again later.' });
  }
  if (!upstream.ok) return reply(502, { error: `The site answered with ${upstream.status}.` });
  if (Number(upstream.headers.get('content-length') ?? 0) > MAX_PAGE_BYTES) return reply(413, { error: 'That page is too large to read.' });
  const html = await readCapped(upstream, MAX_PAGE_BYTES);
  if (html === null) return reply(413, { error: 'That page is too large to read.' });
  return reply(200, {
    url: finalUrl,
    blocks: jsonLdBlocks(html),
    title: meta(html, 'og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim(),
    image: meta(html, 'og:image'),
  });
}
