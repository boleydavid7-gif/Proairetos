export type AppRoute =
  | 'today'
  | 'reflect'
  | 'capture'
  | 'compass'
  | 'plan'
  | 'journal'
  | 'insights'
  | 'schedule'
  | 'review'
  | 'settings'
  | 'calendar';

export const routePaths: Record<AppRoute, string> = {
  today: '/today',
  reflect: '/reflect',
  capture: '/capture',
  compass: '/compass',
  plan: '/plan',
  journal: '/journal',
  insights: '/insights',
  schedule: '/schedule',
  review: '/review',
  settings: '/settings',
  calendar: '/calendar',
};

export const defaultRoute: AppRoute = 'today';
