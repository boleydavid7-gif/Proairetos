import { tooOften } from './safeFetch';

/*
 * The front page's waitlist (`/welcome/`, and each app's page). A plain HTML form posts here, so it works without any
 * script on the page; the email and the apps chosen are kept through the security-definer RPC `join_waitlist`
 * (migration 20261026000000_waitlist.sql) with the publishable key, and the visitor is sent to a thank-you page. The
 * newsletter is a separate box (`letters`, migration 20261101000000_waitlist_letters.sql).
 */

export type WaitlistEnv = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

const APPS = new Set([
  'proairetos', 'askesis', 'soma', 'oikonomia', 'hydros', 'poreia', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'noesis',
]);

const back = (request: Request, page: 'thanks' | 'try-again') => Response.redirect(new URL(`/welcome/${page}/`, request.url).toString(), 303);

export const looksLikeEmail = (email: string) => email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

export async function handleWaitlistRequest(request: Request, env: WaitlistEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return new Response('Not found', { status: 404 });
  // Forms from this site only.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response('Not allowed', { status: 403 });
  if (tooOften(request)) return back(request, 'try-again');
  const form = await request.formData().catch(() => null);
  if (!form) return back(request, 'try-again');
  // A field people never see; filled in, it was a bot. It is thanked and nothing is kept.
  if (String(form.get('website') ?? '')) return back(request, 'thanks');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!looksLikeEmail(email)) return back(request, 'try-again');
  const apps = [...new Set(form.getAll('apps').map(String))].filter((app) => APPS.has(app));
  const source = String(form.get('source') ?? 'welcome').replace(/[^a-z-]/g, '').slice(0, 40) || 'welcome';
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return back(request, 'try-again');
  // The newsletter is its own yes, sent only when its box was ticked.
  const letters = form.get('letters') === 'yes';
  const key = env.SUPABASE_ANON_KEY;
  const join = async (body: Record<string, unknown>) => {
    const response = await fetchImpl(`${env.SUPABASE_URL!.trim().replace(/(\/rest\/v1)?\/*$/, '')}/rest/v1/rpc/join_waitlist`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    return Boolean(response?.ok) && (await response!.json().catch(() => false)) === true;
  };
  let kept = await join(letters ? { email, apps, source, letters } : { email, apps, source });
  // Before migration 20261101000000 the function takes no `letters`: the place on the list is still kept.
  if (!kept && letters) kept = await join({ email, apps, source });
  return back(request, kept ? 'thanks' : 'try-again');
}
