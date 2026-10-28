import { createContext, useContext } from 'react';
import type { AppRoute } from './routes/routeTypes';

export type NavigateOptions = { immediate?: boolean; replace?: boolean };

export const NavigationContext = createContext<(route: AppRoute, options?: NavigateOptions) => void>(() => undefined);

/** The main tab the person was last on, so screens opened from any tab return there. */
export const ReturnRouteContext = createContext<AppRoute>('today');

export function useNavigate(): (route: AppRoute, options?: NavigateOptions) => void {
  return useContext(NavigationContext);
}

export function useReturnRoute(): AppRoute {
  return useContext(ReturnRouteContext);
}

/** Leaves a page the way it was reached: back to the place before it, else to `fallback` (opened from its address). */
export const LeaveContext = createContext<(fallback: AppRoute) => void>(() => undefined);

export function useLeave(fallback: AppRoute): () => void {
  const leave = useContext(LeaveContext);
  return () => leave(fallback);
}
