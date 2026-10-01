import type { AppRoute } from './routes/routeTypes';

// The capture bar also sits on Today, so capturing never requires navigating.
export const navigation: readonly { id: AppRoute; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'reflect', label: 'Reflect' },
  { id: 'capture', label: 'Capture' },
  { id: 'compass', label: 'Compass' },
];
