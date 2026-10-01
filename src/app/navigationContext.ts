import { createContext, useContext } from 'react';
import type { AppRoute } from './routes/routeTypes';

export const NavigationContext = createContext<(route: AppRoute) => void>(() => undefined);

export function useNavigate(): (route: AppRoute) => void {
  return useContext(NavigationContext);
}
