import { APPS } from '../src/core/apps/manifest';
/**
 * Speculation rules for every page (sent with the `Speculation-Rules` header, since no page runs inline scripts):
 * Chrome and Edge fetch another family app's page ahead when a link to it is pointed at or pressed, so it opens
 * at once. Only the page is fetched; nothing in it runs until it is opened.
 */
const APP_IDS = APPS.filter((app) => app.surfaces.prefetch).map((app) => app.id);

export const SPECULATION_RULES = {
  prefetch: [
    {
      where: { or: [{ href_matches: '/' }, ...APP_IDS.map((app) => ({ href_matches: `/${app}/*` }))] },
      eagerness: 'moderate',
    },
  ],
};

export function speculationResponse(): Response {
  return new Response(JSON.stringify(SPECULATION_RULES), {
    headers: { 'content-type': 'application/speculationrules+json', 'cache-control': 'public, max-age=3600' },
  });
}
