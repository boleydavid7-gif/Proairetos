import type { ComponentType } from 'react';
import { BookIcon, CaptureIcon, CompassIcon, SunIcon } from '../components/icons/Icons';
import type { AppRoute } from './routes/routeTypes';

// The capture bar also sits on Today, so capturing never requires navigating.
export const navigation: readonly { id: AppRoute; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'reflect', label: 'Reflect', icon: BookIcon },
  { id: 'capture', label: 'Capture', icon: CaptureIcon },
  { id: 'compass', label: 'Compass', icon: CompassIcon },
];
