import type { AppRoute } from './routes/routeTypes';

// Capture is not a destination: it lives on every screen as the capture bar.
export const navigation: readonly { id: AppRoute; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'day', label: 'Day' },
  { id: 'life', label: 'Life' },
  { id: 'reflect', label: 'Reflect' },
];
