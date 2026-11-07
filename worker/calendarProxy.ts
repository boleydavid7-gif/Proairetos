import { blockedHost, fetchChecked, readCapped, tooOften } from './safeFetch';

/**
 * Fetches a calendar file for the app. Most calendar services do not let a
 * web page fetch their files directly, so this passes one through. It
 * stores nothing, logs nothing, and returns only real calendar files.
 */
export const MAX_CALENDAR_BYTES = 3_000_000;

function reply(status: number, body: string, type = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status,
    headers: { 'content-type': type, 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

export async function handleCalendarRequest(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply(405, 'Not allowed');
  if (tooOften(request)) return reply(429, 'Too many requests. Try again in a minute.');
  const raw = new URL(request.url).searchParams.get('url') ?? '';
  let target: URL;
  try {
    // Apple and others hand out webcal:// links; they are the same file over https.
    target = new URL(raw.replace(/^webcals?:\/\//i, 'https://'));
  } catch {
    return reply(400, 'That does not look like a calendar link.');
  }
  if (target.protocol !== 'https:' || blockedHost(target.hostname)) return reply(400, 'Only https calendar links can be added.');

  let upstream: Response;
  try {
    const result = await fetchChecked(
      target,
      {
        headers: { accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5', 'user-agent': 'Proairetos calendar reader' },
        signal: AbortSignal.timeout(15_000),
      },
      (next) => next.protocol === 'https:',
      fetchImpl,
    );
    if ('refused' in result) return reply(400, 'Only https calendar links can be added.');
    upstream = result.response;
  } catch {
    return reply(502, 'The calendar could not be reached. Try again later.');
  }
  if (!upstream.ok) return reply(502, `The calendar answered with ${upstream.status}. Check the link is the private or public iCal address.`);
  const declared = Number(upstream.headers.get('content-length') ?? 0);
  if (declared > MAX_CALENDAR_BYTES) return reply(413, 'That calendar is too large to read.');
  const text = await readCapped(upstream, MAX_CALENDAR_BYTES);
  if (text === null) return reply(413, 'That calendar is too large to read.');
  if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 2000))) return reply(422, 'That link did not return a calendar. Use the iCal (.ics) address.');
  return reply(200, text, 'text/calendar; charset=utf-8');
}
