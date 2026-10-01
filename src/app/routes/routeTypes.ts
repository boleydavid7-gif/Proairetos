export type AppRoute =
  | 'today'
  | 'reflect'
  | 'capture'
  | 'compass'
  | 'schedule'
  | 'review'
  | 'settings';

export const routePaths: Record<AppRoute, string> = {
  today: '/today',
  reflect: '/reflect',
  capture: '/capture',
  compass: '/compass',
  schedule: '/schedule',
  review: '/review',
  settings: '/settings',
};

export const defaultRoute: AppRoute = 'today';
