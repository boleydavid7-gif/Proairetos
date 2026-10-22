import { handleCalendarRequest } from './calendarProxy';
import { handleRecipeRequest } from './recipeProxy';
import { handlePlantRequest } from './plantProxy';
import { handleTravelEvents } from './travelEvents';
import { handleTravelSearch } from './travelSearch';
import { handleTravelNear } from './travelNear';
import { speculationResponse } from './speculation';
import { handleStorageRequest, type StorageEnv } from './storageToken';
import { handleStravaRequest, type StravaEnv } from './strava';
import { handleCaptureRequest, type CaptureEnv } from './capture';
import { handleWaitlistRequest } from './waitlist';
import { handleStoreRequest, type StoreEnv } from './store';
import { handleTripEmail, type IncomingEmail } from './tripMail';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> }; PLANTNET_KEY?: string; TICKETMASTER_KEY?: string; LITEAPI_KEY?: string; DUFFEL_KEY?: string } & StorageEnv & StravaEnv & CaptureEnv & StoreEnv;

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
    // Capture from anywhere: a Shortcut posts words with the person's inbox token; they are sealed before they are kept.
    if (url.pathname === '/api/capture') return handleCaptureRequest(request, env);
    // The Store: add-ons bought once through Stripe Checkout, kept with the person's account.
    if (url.pathname === '/api/store' || url.pathname.startsWith('/api/store/')) return handleStoreRequest(request, env);
    // The front page's waitlist: a plain form posts here and is sent on to a thank-you page.
    if (url.pathname === '/api/waitlist') return handleWaitlistRequest(request, env);
    // Phyton's photos, from its own pages only (POST, same origin).
    if (url.pathname === '/api/plant') {
      const lang = (request.headers.get('accept-language') ?? 'en').slice(0, 2).toLowerCase();
      return handlePlantRequest(request, env.PLANTNET_KEY, fetch, lang);
    }
    // Poreia's events near a trip (Ticketmaster; GET answers whether it is set up).
    if (url.pathname === '/api/travel/events') return handleTravelEvents(request, env.TICKETMASTER_KEY);
    // Poreia's places nearby (OpenStreetMap through Overpass, kept at the edge for a day).
    if (url.pathname === '/api/travel/near') return handleTravelNear(request);
    if (url.pathname === '/api/travel' || url.pathname.startsWith('/api/travel/')) return handleTravelSearch(request, env);
    // Keep sibling apps reachable at their clean family URLs without requiring a trailing slash.
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
    if (url.pathname === '/poreia') {
      const poreiaUrl = new URL(request.url);
      poreiaUrl.pathname = '/poreia/';
      return env.ASSETS.fetch(new Request(poreiaUrl, request));
    }
    return env.ASSETS.fetch(request);
  },
  /** Poreia's forwarding address (Email Routing sends trips.<token>@ here): booking emails sealed for the person. */
  async email(message: IncomingEmail, env: Env): Promise<void> {
    await handleTripEmail(message, env);
  },
};
