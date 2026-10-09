import { handleCalendarRequest } from './calendarProxy';
import { handleRecipeRequest } from './recipeProxy';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

/** The phone apps load their pages from the device, so they ask this Worker from another origin. */
const NATIVE_ORIGINS = new Set(['capacitor://localhost', 'ionic://localhost', 'https://localhost', 'http://localhost']);

function withCors(request: Request, response: Response): Response {
  const origin = request.headers.get('origin');
  if (!origin || !NATIVE_ORIGINS.has(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', origin);
  headers.set('vary', 'origin');
  return new Response(response.body, { status: response.status, headers });
}

/** Serves the family apps; /api/calendar and /api/recipe pass through their small server helpers. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/calendar' || url.pathname === '/api/recipe') {
      if (request.method === 'OPTIONS') return withCors(request, new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } }));
      return withCors(request, await (url.pathname === '/api/calendar' ? handleCalendarRequest(request) : handleRecipeRequest(request)));
    }
    // Keep the sibling app reachable at the clean family URL without requiring a trailing slash.
    if (url.pathname === '/praxis') {
      const praxisUrl = new URL(request.url);
      praxisUrl.pathname = '/praxis/';
      return env.ASSETS.fetch(new Request(praxisUrl, request));
    }
    if (url.pathname === '/theoria') {
      const theoriaUrl = new URL(request.url);
      theoriaUrl.pathname = '/theoria/';
      return env.ASSETS.fetch(new Request(theoriaUrl, request));
    }
    return env.ASSETS.fetch(request);
  },
};
