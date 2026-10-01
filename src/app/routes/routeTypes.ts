export type AppRoute =
  | 'now'
  | 'day'
  | 'life'
  | 'reflect'
  | 'settings';

export const routePaths: Record<AppRoute, string> = {
  now: '/now',
  day: '/day',
  life: '/life',
  reflect: '/reflect',
  settings: '/settings',
};

export const defaultRoute: AppRoute = 'now';
