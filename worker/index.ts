import { handleCalendarRequest } from './calendarProxy';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

/** Serves the app's files; /api/calendar passes calendar files through for the app. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/calendar') return handleCalendarRequest(request);
    return env.ASSETS.fetch(request);
  },
};
