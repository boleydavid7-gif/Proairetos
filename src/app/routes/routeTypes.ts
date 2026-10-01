export type AppRoute =
  | 'today'
  | 'reflect'
  | 'capture'
  | 'compass'
  | 'schedule'
  | 'settings';

export const routePaths: Record<AppRoute, string> = {
  today: '/today',
  reflect: '/reflect',
  capture: '/capture',
  compass: '/compass',
  schedule: '/schedule',
  settings: '/settings',
};

export const defaultRoute: AppRoute = 'today';
