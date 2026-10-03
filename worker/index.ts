import { handleCalendarRequest } from './calendarProxy';
import { handleRecipeRequest } from './recipeProxy';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

/** Serves the app's files; /api/calendar passes calendar files through; /api/recipe reads a recipe page for SOMA. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/calendar') return handleCalendarRequest(request);
    if (url.pathname === '/api/recipe') return handleRecipeRequest(request);
    return env.ASSETS.fetch(request);
  },
};
