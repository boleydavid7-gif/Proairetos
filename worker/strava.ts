import { tooOften } from './safeFetch';

/*
 * Strava, for Askesis: the sign-in step that needs the app's secret, and the person's own activities passed through
 * with only the fields Askesis keeps (when, what, how long, how far, heart rate). Nothing is stored or logged here.
 * GET /api/strava says whether it is set up (and the public client id); POST trades a code or refresh token;
 * GET /api/strava/activities?after=EPOCH brings the activities since then, with the person's own token.
 */

export type StravaEnv = { STRAVA_CLIENT_ID?: string; STRAVA_CLIENT_SECRET?: string };

export type StravaActivity = {
  id: number;
  type: string;
  start: string;
  seconds?: number;
  meters?: number;
  avgHr?: number;
  name?: string;
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' },
  });
}

function client(env: StravaEnv) {
  const id = env.STRAVA_CLIENT_ID?.trim();
  const secret = env.STRAVA_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

/** Only what Askesis keeps from one Strava activity. */
export function trimActivity(raw: Record<string, unknown>): StravaActivity | null {
  if (typeof raw.id !== 'number' || typeof raw.start_date_local !== 'string') return null;
  const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined);
  return {
    id: raw.id,
    type: typeof raw.sport_type === 'string' ? raw.sport_type : typeof raw.type === 'string' ? raw.type : 'Workout',
    start: raw.start_date_local,
    seconds: number(raw.moving_time),
    meters: number(raw.distance),
    avgHr: number(raw.average_heartrate),
    name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : undefined,
  };
}

export async function handleStravaRequest(request: Request, env: StravaEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return reply(403, { error: 'Not allowed' });
  const known = client(env);

  if (url.pathname === '/api/strava/activities') {
    if (request.method !== 'GET') return reply(405, { error: 'Not allowed' });
    if (!known) return reply(503, { error: 'Strava is not set up yet.' });
    if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const after = Number(url.searchParams.get('after') ?? 0);
    if (!token || token.length > 400 || !Number.isFinite(after)) return reply(400, { error: 'Not understood.' });
    let upstream: Response;
    try {
      upstream = await fetchImpl(`https://www.strava.com/api/v3/athlete/activities?after=${Math.max(0, Math.floor(after))}&per_page=100`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      });
    } catch {
      return reply(502, { error: 'Strava could not be reached. Try again.' });
    }
    if (upstream.status === 401) return reply(401, { error: 'Strava did not accept this connection. Connect it again.' });
    if (!upstream.ok) return reply(502, { error: 'Strava could not be reached. Try again.' });
    const list = (await upstream.json().catch(() => [])) as Record<string, unknown>[];
    return reply(200, { activities: (Array.isArray(list) ? list : []).map(trimActivity).filter(Boolean) });
  }

  if (url.pathname !== '/api/strava') return reply(404, { error: 'Not found' });
  if (request.method === 'GET') return reply(200, { clientId: known?.id ?? null });
  if (request.method !== 'POST') return reply(405, { error: 'Not allowed' });
  if (!known) return reply(503, { error: 'Strava is not set up yet.' });
  if (tooOften(request)) return reply(429, { error: 'Too many requests. Try again in a minute.' });

  let body: { code?: string; refresh?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'Not understood.' });
  }
  const form = new URLSearchParams({ client_id: known.id, client_secret: known.secret });
  if (typeof body.refresh === 'string' && body.refresh.length < 400) {
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', body.refresh);
  } else if (typeof body.code === 'string' && body.code.length < 400) {
    form.set('grant_type', 'authorization_code');
    form.set('code', body.code);
  } else {
    return reply(400, { error: 'Not understood.' });
  }
  let upstream: Response;
  try {
    upstream = await fetchImpl('https://www.strava.com/oauth/token', { method: 'POST', body: form, headers: { accept: 'application/json' } });
  } catch {
    return reply(502, { error: 'Strava could not be reached. Try again.' });
  }
  const data = (await upstream.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    athlete?: { firstname?: string; lastname?: string };
  };
  if (!upstream.ok || !data.access_token) return reply(upstream.status === 400 || upstream.status === 401 ? 401 : 502, { error: 'Strava did not accept this connection. Connect it again.' });
  const name = [data.athlete?.firstname, data.athlete?.lastname].filter(Boolean).join(' ') || undefined;
  return reply(200, { access: data.access_token, refresh: data.refresh_token, expiresAt: data.expires_at, name });
}
