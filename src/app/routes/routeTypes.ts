export type AppRoute =
  | 'now'
  | 'day'
  | 'life'
  | 'reflect'
  | 'capture'
  | 'settings';

export const defaultRoute: AppRoute = 'now';
