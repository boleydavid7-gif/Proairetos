import { createContext, useContext } from 'react';
import type { AppRoute } from './routes/routeTypes';

export const NavigationContext = createContext<(route: AppRoute) => void>(() => undefined);

/** The main tab the person was last on, so screens opened from any tab return there. */
export const ReturnRouteContext = createContext<AppRoute>('today');

export function useNavigate(): (route: AppRoute) => void {
  return useContext(NavigationContext);
}

export function useReturnRoute(): AppRoute {
  return useContext(ReturnRouteContext);
}
