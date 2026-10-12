import type { ComponentType } from 'react';
import { BookIcon, CalendarIcon, CaptureIcon, SunIcon } from '../components/icons/Icons';
import type { AppRoute } from './routes/routeTypes';

// The capture bar also sits on Today, so capturing never requires navigating. Compass and Meditate open from Reflect.
export const navigation: readonly { id: AppRoute; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'reflect', label: 'Reflect', icon: BookIcon },
  { id: 'plan', label: 'Days ahead', icon: CalendarIcon },
  { id: 'capture', label: 'Capture', icon: CaptureIcon },
];
