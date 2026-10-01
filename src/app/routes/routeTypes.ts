export type AppRoute =
  | 'today'
  | 'reflect'
  | 'capture'
  | 'compass'
  | 'settings';

export const routePaths: Record<AppRoute, string> = {
  today: '/today',
  reflect: '/reflect',
  capture: '/capture',
  compass: '/compass',
  settings: '/settings',
};

export const defaultRoute: AppRoute = 'today';
