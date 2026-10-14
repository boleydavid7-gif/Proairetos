import { handleCalendarRequest } from './calendarProxy';
import { handleRecipeRequest } from './recipeProxy';
import { handlePlantRequest } from './plantProxy';
import { speculationResponse } from './speculation';
import { handleStorageRequest, type StorageEnv } from './storageToken';
import { handleStravaRequest, type StravaEnv } from './strava';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> }; PLANTNET_KEY?: string } & StorageEnv & StravaEnv;

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

/** Serves the family apps; /api/calendar, /api/recipe and /api/plant pass through their small server helpers. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/calendar' || url.pathname === '/api/recipe') {
      if (request.method === 'OPTIONS') return withCors(request, new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } }));
      return withCors(request, await (url.pathname === '/api/calendar' ? handleCalendarRequest(request) : handleRecipeRequest(request)));
    }
    if (url.pathname === '/api/speculation-rules') return speculationResponse();
    // Bring your own storage: which providers are set up, and the sign-in step that needs their secrets.
    if (url.pathname === '/api/storage') return handleStorageRequest(request, env);
    // Askesis's Strava connection: the sign-in step that needs the secret, and the person's own activities.
    if (url.pathname === '/api/strava' || url.pathname === '/api/strava/activities') return handleStravaRequest(request, env);
    // Phyton's photos, from its own pages only (POST, same origin).
    if (url.pathname === '/api/plant') {
      const lang = (request.headers.get('accept-language') ?? 'en').slice(0, 2).toLowerCase();
      return handlePlantRequest(request, env.PLANTNET_KEY, fetch, lang);
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
