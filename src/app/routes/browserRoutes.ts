import { defaultRoute, routePaths, type AppRoute } from './routeTypes';

const routeByPath = new Map(Object.entries(routePaths).map(([route, path]) => [path, route as AppRoute]));

export function routeForPath(pathname: string): AppRoute {
  const path = pathname.replace(/\/$/, '') || '/';
  return routeByPath.get(path) ?? defaultRoute;
}

export function pathForRoute(route: AppRoute): string {
  return routePaths[route];
}

export function routeFromHistoryState(state: unknown): AppRoute | undefined {
  if (!state || typeof state !== 'object') return undefined;
  const route = (state as { proairetosRoute?: unknown }).proairetosRoute;
  return typeof route === 'string' && route in routePaths ? route as AppRoute : undefined;
}

/** How many of the app's own places come before this history entry (0: the place the app was opened at). */
export function depthFromHistoryState(state: unknown): number {
  if (!state || typeof state !== 'object') return 0;
  const depth = (state as { proairetosDepth?: unknown }).proairetosDepth;
  return typeof depth === 'number' && depth > 0 ? depth : 0;
}
