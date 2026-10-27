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
