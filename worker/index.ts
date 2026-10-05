import { handleCalendarRequest } from './calendarProxy';
import { handleRecipeRequest } from './recipeProxy';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

/** Serves the family apps; /api/calendar and /api/recipe pass through their small server helpers. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/calendar') return handleCalendarRequest(request);
    if (url.pathname === '/api/recipe') return handleRecipeRequest(request);
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
